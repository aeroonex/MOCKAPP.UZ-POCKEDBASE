"use client";
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import AppFooter from "@/components/AppFooter"; // Yangi import
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle, Trash2, ArrowLeft, Cloud, Zap, CheckCircle2, Lock } from "lucide-react";
import { format } from "date-fns";
import { RecordedSession } from "@/lib/types";
import { showError, showSuccess } from "@/utils/toast";
import { getLocalRecordings, deleteLocalRecording, getRecordingBlob, updateLocalRecordingSupabaseUrl, upsertRecordingMetadataToSupabase } from "@/lib/local-db";
import { Link } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, // Renamed to avoid conflict
  DialogHeader as DialogHeaderComponent, // Renamed to avoid conflict
  DialogTitle as DialogTitleComponent, // Renamed to avoid conflict
} from "@/components/ui/dialog";
import PricingCard from "@/components/PricingCard";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import * as tus from 'tus-js-client';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfile, formatBytes } from "@/hooks/use-profile";
import { Progress } from "@/components/ui/progress";
import { useProgress, setProgress, removeProgress } from "@/utils/uploadProgress"; // useProgress ni import qilish
import { Badge } from "@/components/ui/badge"; // Badge import qilindi
import { useAuth } from "@/context/AuthProvider"; // useAuth import qilindi

// Xotira ishlatilishini ko'rsatuvchi kichik komponent
const StorageUsageCard: React.FC<{ isGuest: boolean, onOpenPricing: () => void }> = ({ isGuest, onOpenPricing }) => {
  const { profile, loading } = useProfile();
  const { t } = useTranslation();
  
  if (isGuest) {
    // Mehmon rejimi uchun maxsus ko'rinish
    const totalLimit = 10737418240; // 10 GB default limit
    const usedSpace = 0; // Mehmon rejimida ishlatilgan joy 0 deb hisoblanadi
    const usagePercentage = 0;
    
    return (
      <Card className="p-4 mb-6 bg-[#1A237E] text-white border-4 border-[#3F51B5] shadow-2xl rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center p-4">
            <Lock className="h-8 w-8 mx-auto mb-2 text-yellow-300" />
            <p className="text-sm font-semibold mb-3">{t("records_page.guest_storage_description")}</p>
            <Button onClick={onOpenPricing} size="sm" className="bg-yellow-400 text-black hover:bg-yellow-500">
              {t("records_page.view_plans")}
            </Button>
          </div>
        </div>
        
        {/* Orqa fondagi dizayn (Locked) */}
        <div className="opacity-30">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-6 w-6 text-yellow-300" />
              <h4 className="text-xl font-bold">{t("user_profile_page.cloud_storage")}</h4>
              <Badge className="bg-yellow-400 text-black font-bold"> BASIC </Badge>
            </div>
          </div>
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-3xl font-bold">
              {formatBytes(usedSpace)}
            </p>
            <p className="text-lg font-medium text-gray-300"> / {formatBytes(totalLimit)}</p>
          </div>
          <div className="w-full bg-[#3F51B5] rounded-full h-2.5 overflow-hidden mb-1">
            <div 
              className="h-2.5 rounded-full bg-yellow-300" 
              style={{ width: `${usagePercentage}%` }} 
            />
          </div>
          <div className="flex justify-end">
            <p className="text-sm text-gray-300">
              {t("records_page.used_percentage", { percentage: usagePercentage.toFixed(1) })}
            </p>
          </div>
        </div>
      </Card>
    );
  }
  
  if (loading || !profile) {
    return (
      <Card className="p-4 mb-6">
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
          <div className="h-3 bg-muted rounded-full w-full animate-pulse"></div>
        </div>
      </Card>
    );
  }
  
  const totalLimit = profile.storage_limit_bytes || 0;
  const usedSpace = profile.storage_used_bytes || 0;
  const usagePercentage = totalLimit > 0 ? (usedSpace / totalLimit) * 100 : 0;
  const isPremium = profile.tariff_name !== 'Basic';
  
  const getProgressColor = () => {
    if (usagePercentage >= 90) {
      return "bg-red-500";
    }
    if (usagePercentage >= 75) {
      return "bg-yellow-400";
    }
    return "bg-yellow-300"; // Premium rangga mos sariq
  };
  
  return (
    <Card className="p-4 mb-6 bg-[#1A237E] text-white border-4 border-[#3F51B5] shadow-2xl rounded-xl">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-6 w-6 text-yellow-300" />
          <h4 className="text-xl font-bold">{t("user_profile_page.cloud_storage")}</h4>
          {isPremium && (
            <Badge className="bg-yellow-400 text-black font-bold hover:bg-yellow-500"> PREMIUM </Badge>
          )}
        </div>
      </div>
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-3xl font-bold">
          {formatBytes(usedSpace)}
        </p>
        <p className="text-lg font-medium text-gray-300"> / {formatBytes(totalLimit)}</p>
      </div>
      
      {/* Maxsus Progress Bar */}
      <div className="w-full bg-[#3F51B5] rounded-full h-2.5 overflow-hidden mb-1">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`} 
          style={{ width: `${usagePercentage}%` }} 
        />
      </div>
      <div className="flex justify-end">
        <p className="text-sm text-gray-300">
          {t("records_page.used_percentage", { percentage: usagePercentage.toFixed(1) })}
        </p>
      </div>
    </Card>
  );
};

const Records: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, fetchProfile } = useProfile();
  const isGuestMode = localStorage.getItem("isGuestMode") === "true" && !user;
  const [uploadingRecordId, setUploadingRecordId] = useState<string | null>(null);
  const [uploadErrorRecordId, setUploadErrorRecordId] = useState<string | null>(null);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  
  // useProgress hookidan foydalanish
  const progressMap = useProgress();
  const isDownloading = Array.from(progressMap.keys()).some(key => key.startsWith('download-'));
  
  const fetchRecordings = useCallback(async () => {
    setIsLoading(true);
    let loadedRecordings: RecordedSession[] = [];
    
    try {
      const data = await getLocalRecordings();
      loadedRecordings = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecordings(loadedRecordings);
    } catch (error: any) {
      showError(`${t("records_page.error_loading_recordings")} ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [t]);
  
  useEffect(() => {
    fetchRecordings();
    
    return () => {
      recordings.forEach(rec => {
        if (rec.isLocalBlobAvailable && rec.video_url.startsWith('blob:')) {
          URL.revokeObjectURL(rec.video_url);
        }
      });
    };
  }, [fetchRecordings]);
  
  const handleUploadToSupabase = useCallback(async (recording: RecordedSession) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      showError(t("records_page.error_login_to_upload"));
      return;
    }
    
    if (recording.supabase_url) {
      showError(t("records_page.error_already_uploaded"));
      return;
    }
    
    const blob = await getRecordingBlob(recording.id);
    if (!blob) {
      showError(t("records_page.error_no_video_data"));
      return;
    }
    
    if (profile && (profile.storage_used_bytes + blob.size > profile.storage_limit_bytes)) {
      showError(t("records_page.error_storage_limit_exceeded"));
      return;
    }
    
    setUploadingRecordId(recording.id);
    setUploadErrorRecordId(null);
    setProgress(recording.id, 0); // Upload progressni boshlash
    
    const filePath = `${session.user.id}/${recording.id}.webm`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const upload = new tus.Upload(blob, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
        'apikey': supabaseAnonKey,
      },
      metadata: {
        bucketName: 'recordings',
        objectName: filePath,
        contentType: 'video/webm',
        cacheControl: '3600',
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = (bytesUploaded / bytesTotal) * 100;
        setProgress(recording.id, percentage);
      },
      onSuccess: async () => {
        const { data: publicUrlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(filePath);
          
        if (publicUrlData.publicUrl) {
          await updateLocalRecordingSupabaseUrl(recording.id, publicUrlData.publicUrl);
          await upsertRecordingMetadataToSupabase({
            id: recording.id,
            user_id: session.user.id,
            timestamp: recording.timestamp,
            duration: recording.duration,
            student_id: recording.student_id,
            student_name: recording.student_name,
            student_phone: recording.student_phone,
            supabase_url: publicUrlData.publicUrl,
          });
          
          await fetchProfile();
          await fetchRecordings();
          showSuccess(t("records_page.upload_success"));
        } else {
          showError(t("records_page.error_getting_public_url"));
          setUploadErrorRecordId(recording.id);
        }
        
        setUploadingRecordId(null);
        removeProgress(recording.id);
      },
      onError: (error) => {
        console.error("Tus upload error:", error);
        let errorMessage = `${t("records_page.error_uploading_to_cloud")} ${error.message}`;
        
        if (error.originalRequest && (error.originalRequest as any).response && 
            (error.originalRequest as any).response.getStatus() === 413) {
          errorMessage = t("records_page.error_max_size_exceeded");
        }
        
        showError(errorMessage);
        setUploadErrorRecordId(recording.id);
        setUploadingRecordId(null);
        removeProgress(recording.id);
      },
    });
    
    upload.start();
  }, [t, fetchRecordings, fetchProfile, profile]);
  
  const handleUploadClick = (recording: RecordedSession) => {
    if (isGuestMode) {
      setIsPricingDialogOpen(true);
    } else {
      handleUploadToSupabase(recording);
    }
  };
  
  const handleDownload = useCallback(async (recording: RecordedSession) => {
    const downloadId = `download-${recording.id}`;
    setProgress(downloadId, 0);
    
    try {
      let urlToDownload = recording.video_url;
      let filename = `recording_${recording.id}.webm`;
      
      if (recording.student_name && recording.student_phone) {
        const cleanName = recording.student_name.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanPhone = recording.student_phone.replace(/[^0-9]/g, '');
        filename = `${cleanName}_${cleanPhone}.webm`;
      } else if (recording.student_name) {
        const cleanName = recording.student_name.replace(/[^a-zA-Z0-9]/g, '_');
        filename = `${cleanName}.webm`;
      } else if (recording.student_phone) {
        const cleanPhone = recording.student_phone.replace(/[^0-9]/g, '');
        filename = `${cleanPhone}.webm`;
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', urlToDownload, true);
      xhr.responseType = 'blob';
      
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = (event.loaded / event.total) * 100;
          setProgress(downloadId, percentage);
        }
      };
      
      await new Promise<Blob>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`HTTP error! Status: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during download.'));
        xhr.send();
      }).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccess(t("records_page.success_downloaded"));
      });
    } catch (error: any) {
      showError(`${t("records_page.error_downloading_video")} ${error.message}`);
    } finally {
      removeProgress(downloadId);
    }
  }, [t]);
  
  const handleDelete = useCallback(async (recording: RecordedSession) => {
    try {
      if (recording.isLocalBlobAvailable && recording.video_url.startsWith('blob:')) {
        URL.revokeObjectURL(recording.video_url);
      }
      
      const localDeleted = await deleteLocalRecording(recording.id);
      if (localDeleted) {
        setRecordings(prev => prev.filter(rec => rec.id !== recording.id));
        await fetchProfile();
        showSuccess(t("records_page.success_recording_deleted"));
      }
    } catch (error: any) {
      showError(`${t("records_page.error_deleting_recording")} ${error.message}`);
    }
  }, [t, fetchProfile]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader className="pt-8">
            <div className="flex justify-between items-center">
              <Link to="/home">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("common.back")}
                </Button>
              </Link>
              <CardTitle className="text-xl sm:text-3xl font-bold text-center flex-grow">
                {t("records_page.your_recordings")}
              </CardTitle>
              {/* Joyni to'ldirish uchun bo'sh div */}
              <div className="w-[80px] h-4"></div>
            </div>
            <CardDescription className="text-center mt-2">{t("records_page.review_past_sessions")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StorageUsageCard 
              isGuest={isGuestMode} 
              onOpenPricing={() => setIsPricingDialogOpen(true)} 
            />
            
            {isLoading ? (
              <p className="text-center">{t("common.loading")}</p>
            ) : recordings.length === 0 ? (
              <p className="text-muted-foreground text-center">{t("records_page.no_recordings_available")}</p>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording, index) => {
                  const isUploading = uploadingRecordId === recording.id;
                  const uploadError = uploadErrorRecordId === recording.id;
                  
                  // Progressni yuklash va yuklab olish uchun alohida olish
                  const uploadProgressValue = progressMap.get(recording.id) || 0;
                  const downloadProgressValue = progressMap.get(`download-${recording.id}`) || 0;
                  const isCurrentlyDownloading = downloadProgressValue > 0 && downloadProgressValue < 100;
                  
                  return (
                    <Card key={recording.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="text-left mb-2 sm:mb-0">
                          <h3 className="text-lg font-semibold">
                            {recording.student_name 
                              ? `${t("records_page.student")}: ${recording.student_name}` 
                              : `${t("records_page.session")} ${recordings.length - index}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(recording.timestamp), "PPP - p")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("records_page.duration")}: {Math.floor(recording.duration / 60)}m {recording.duration % 60}s
                          </p>
                          {recording.supabase_url && (
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {t("records_page.uploaded_to_cloud")}
                            </p>
                          )}
                          {uploadError && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                              <Cloud className="h-3 w-3" />
                              {t("records_page.upload_failed")}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap justify-end gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                          {/* Play Button */}
                          <button 
                            onClick={() => window.open(recording.video_url, '_blank')}
                            className="Download-button"
                            disabled={isDownloading || isUploading}
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span>{t("records_page.play")}</span>
                          </button>
                          
                          {/* Download Local Button */}
                          {recording.isLocalBlobAvailable && (
                            <button 
                              onClick={() => handleDownload({ ...recording, supabase_url: undefined })} 
                              className="Download-button"
                              disabled={isDownloading || isUploading}
                            >
                              <svg
                                viewBox="0 0 640 512"
                                width="16"
                                height="16"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  fill="white"
                                  d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                                ></path>
                              </svg>
                              <span>{t("records_page.download_local")}</span>
                            </button>
                          )}
                          
                          {/* Upload Button */}
                          {isUploading ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1 w-full sm:w-auto"
                              disabled
                            >
                              <Cloud className="h-4 w-4 animate-pulse" />
                              {t("records_page.uploading_to_cloud")} ({uploadProgressValue.toFixed(0)}%)
                            </Button>
                          ) : recording.supabase_url ? (
                            <button 
                              onClick={() => handleDownload(recording)} 
                              className="Download-button"
                              disabled={isDownloading}
                            >
                              {isCurrentlyDownloading ? (
                                <>
                                  <Zap className="h-4 w-4 animate-pulse" />
                                  <span>{t("records_page.downloading")} ({downloadProgressValue.toFixed(0)}%)</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    viewBox="0 0 640 512"
                                    width="16"
                                    height="16"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      fill="white"
                                      d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                                    ></path>
                                  </svg>
                                  <span>{t("records_page.download_from_cloud")}</span>
                                </>
                              )}
                            </button>
                          ) : (user?.id || isGuestMode) && (
                            <Button 
                              onClick={() => handleUploadClick(recording)} 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1 w-full sm:w-auto"
                              disabled={isDownloading}
                            >
                              <Cloud className="h-4 w-4" />
                              {t("records_page.upload")}
                            </Button>
                          )}
                          
                          {/* Delete Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button 
                                className="Download-button destructive-download-button"
                                disabled={isDownloading || isUploading}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>{t("records_page.delete")}</span>
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("records_page.delete_recording_confirm_title")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("records_page.delete_recording_confirm_description")}
                                  {recording.supabase_url && (
                                    <span className="block text-red-500 mt-2">
                                      {t("records_page.delete_from_cloud_warning")}
                                    </span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("add_question_page.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(recording)}>
                                  {t("records_page.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      {recording.student_name && (
                        <div className="text-left text-sm text-muted-foreground mt-2 border-t pt-2">
                          <p><strong>{t("mock_test_page.student_id")}:</strong> {recording.student_id}</p>
                          <p><strong>{t("mock_test_page.student_phone")}:</strong> {recording.student_phone}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <AppFooter />
      
      <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 pb-0">
              <DialogHeaderComponent>
                <DialogTitleComponent>{t("records_page.guest_upload_title")}</DialogTitleComponent>
                <DialogDescriptionComponent>
                  {t("records_page.guest_upload_description")}
                </DialogDescriptionComponent>
              </DialogHeaderComponent>
            </div>
            <div className="bg-background p-4">
              <PricingCard isDialog={true} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Records;