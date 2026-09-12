#!/usr/bin/env bash
# =============================================================================
# Mockapp.uz (edumock.uz) — k3s ga joylash skripti
#
# Bu skript MAVJUD loyihalarga TEGMAYDI:
#   · faqat "edumock" namespace ichida ishlaydi
#   · o'z Postgres'i (StatefulSet, local-path disk) — tashqariga chiqarilmaydi
#   · tashqi kirish faqat mavjud ingress-nginx + cert-manager orqali (edumock.uz)
#   · host nginx / 80 / 443 portlarga tegmaydi
#
# Ishlatish (server, loyiha papkasida):
#   bash deploy/k8s-deploy.sh                 # build + import + apply
#   SKIP_BUILD=1 bash deploy/k8s-deploy.sh    # faqat manifestlarni qayta apply
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... bash deploy/k8s-deploy.sh   # birinchi marta admin
# =============================================================================
set -euo pipefail
trap 'rc=$?; if [ $rc -ne 0 ]; then echo; echo "XATO: joylash $rc kodi bilan to'"'"'xtadi"; fi; exit $rc' EXIT

NS="edumock"
HOST="edumock.uz"
TAG="${TAG:-$(date +%s)}"
API_IMAGE="edumock-api:${TAG}"
WEB_IMAGE="edumock-web:${TAG}"
SKIP_BUILD="${SKIP_BUILD:-0}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
CRED_FILE="${HERE}/.admin-credentials"

say()  { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[1;31mXATO: %s\033[0m\n' "$*" >&2; exit 1; }

command -v kubectl >/dev/null || die "kubectl topilmadi"
command -v docker  >/dev/null || die "docker topilmadi"

ctr_import() {
  if command -v k3s >/dev/null 2>&1; then
    k3s ctr images import "$1"
  elif [ -S /run/k3s/containerd/containerd.sock ]; then
    ctr -a /run/k3s/containerd/containerd.sock -n k8s.io images import "$1"
  else
    die "k3s containerd topilmadi — image import qilib bo'lmadi"
  fi
}

cd "$HERE"

# ------------------------------------------------------------------ build
if [ "$SKIP_BUILD" != "1" ]; then
  say "Image'lar qurilmoqda (birinchi marta 3-6 daqiqa)"
  docker build --provenance=false --sbom=false -t "$API_IMAGE" ./server
  docker build --provenance=false --sbom=false -t "$WEB_IMAGE" -f Dockerfile.web .

  say "Image'lar k3s containerd'ga import qilinmoqda"
  tmp="$(mktemp -d)"
  docker save "$API_IMAGE" "$WEB_IMAGE" -o "$tmp/edumock.tar"
  ctr_import "$tmp/edumock.tar"
  rm -rf "$tmp"
  info "import tugadi: $API_IMAGE, $WEB_IMAGE"
else
  info "build o'tkazib yuborildi (SKIP_BUILD=1)"
fi

# -------------------------------------------------------------- namespace
say "Namespace"
kubectl apply -f deploy/k8s/00-namespace.yaml

# ---------------------------------------------------------------- secrets
say "Maxfiy ma'lumotlar"
if kubectl -n "$NS" get secret edumock-secrets >/dev/null 2>&1; then
  info "edumock-secrets allaqachon bor — parollar o'zgartirilmaydi"
else
  PG_PASS="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)"
  JWT="$(head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 64)"
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@edumock.uz}"
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 16)}"
  DB_URL="postgres://mockapp:${PG_PASS}@edumock-db.${NS}.svc.cluster.local:5432/mockapp"
  kubectl -n "$NS" create secret generic edumock-secrets \
    --from-literal=POSTGRES_PASSWORD="$PG_PASS" \
    --from-literal=JWT_SECRET="$JWT" \
    --from-literal=DATABASE_URL="$DB_URL" \
    --from-literal=ADMIN_EMAIL="$ADMIN_EMAIL" \
    --from-literal=ADMIN_PASSWORD="$ADMIN_PASSWORD"
  umask 077
  printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\n' "$ADMIN_EMAIL" "$ADMIN_PASSWORD" > "$CRED_FILE"
  info "superadmin ma'lumotlari saqlandi: $CRED_FILE"
fi

# ------------------------------------------------------------- manifests
say "PostgreSQL"
kubectl apply -f deploy/k8s/02-postgres.yaml
kubectl -n "$NS" rollout status statefulset/edumock-db --timeout=180s

say "API va Web"
kubectl apply -f deploy/k8s/03-api.yaml
kubectl apply -f deploy/k8s/04-web.yaml
if [ "$SKIP_BUILD" != "1" ]; then
  kubectl -n "$NS" set image deployment/edumock-api api="$API_IMAGE"
  kubectl -n "$NS" set image deployment/edumock-web web="$WEB_IMAGE"
fi
kubectl -n "$NS" rollout status deployment/edumock-api --timeout=240s
kubectl -n "$NS" rollout status deployment/edumock-web --timeout=180s

say "Ingress (${HOST})"
kubectl apply -f deploy/k8s/05-ingress.yaml

# ---------------------------------------------------------------- holat
say "Holat"
kubectl -n "$NS" get pods,svc,ingress,pvc
echo
info "Sertifikat holati:  kubectl -n $NS get certificate"
info "API loglari:        kubectl -n $NS logs -f deploy/edumock-api"
info "Sayt:               https://${HOST}"
