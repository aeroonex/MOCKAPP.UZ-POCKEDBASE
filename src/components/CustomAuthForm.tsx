"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Turnstile } from '@marsidev/react-turnstile';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const VITE_TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

if (!VITE_TURNSTILE_SITE_KEY) {
  console.error("Turnstile site key is not defined. Please set VITE_TURNSTILE_SITE_KEY in your .env file.");
}

const CustomAuthForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      showError(t("common.captcha_challenge_error"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { captchaToken },
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess(t("common.confirmation_email_sent"));
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      showError(t("common.captcha_challenge_error"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess(t("common.success_logged_in"));
      navigate('/home');
    }
    setLoading(false);
  };

  return (
    <Tabs defaultValue="sign-in" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-in">{t("common.sign_in")}</TabsTrigger>
        <TabsTrigger value="sign-up">{t("common.sign_up")}</TabsTrigger>
      </TabsList>
      <TabsContent value="sign-in">
        <form onSubmit={handleSignIn} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email-in">{t("common.email")}</Label>
            <Input id="email-in" type="email" placeholder={t("common.enter_your_email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-in">{t("common.password")}</Label>
            <Input id="password-in" type="password" placeholder={t("common.enter_your_password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="flex justify-center">
            <Turnstile
              siteKey={VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} // Default test key
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
            {loading ? t("common.logging_in") : t("common.sign_in")}
          </Button>
        </form>
      </TabsContent>
      <TabsContent value="sign-up">
        <form onSubmit={handleSignUp} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email-up">{t("common.email")}</Label>
            <Input id="email-up" type="email" placeholder={t("common.enter_your_email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-up">{t("common.password")}</Label>
            <Input id="password-up" type="password" placeholder={t("common.enter_your_password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="flex justify-center">
            <Turnstile
              siteKey={VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} // Default test key
              onSuccess={(token) => setCaptchaToken(token)}
              onError={() => setCaptchaToken(null)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
            {loading ? t("common.signing_up") : t("common.sign_up")}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
};

export default CustomAuthForm;