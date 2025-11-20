"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle, Trash2, ArrowLeft, Cloud, Zap, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { RecordedSession } from "@/lib/types";
import { showError, showSuccess } from "@/utils/toast";
import { getLocalRecordings, deleteLocalRecording, getRecordingBlob, updateLocalRecordingSupabaseUrl, upsertRecordingMetadataToSupabase } from "@/lib/local-db";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useUploadProgress, setUploadProgress, removeUploadProgress } from "@/utils/uploadProgress";

const Records: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const { user } = useAuth();
  const uploadProgress = useUploadProgress();
  const [downloadingRecordId, setDownloadingRecordId] = useState<string | null>(null); // New state for download status

  const fetchRecordings = useCallback(async () => {
    setIsLoading(true); // Set to true at the start
    let loadedRecordings: RecordedSession[] = [];
    try {
      const data = await getLocalRecordings();
      loadedRecordings = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecordings(loadedRecordings);
    } catch (error: any) {
      showError(`${t("records_page.error_loading_recordings")} ${error.message}`);
    } finally {
      setIsLoading(false); // Set to false in finally block
    }
  }, [t]); // Dependency array for useCallback

  useEffect(() => {
    fetchRecordings();

    // Cleanup function for object URLs
    return () => {
      recordings.forEach(rec => {
        if (rec.isLocalBlobAvailable && rec.video_url.startsWith('blob:')) {
          URL.revokeObjectURL(rec.video_url);
        }
      });
    };
  }, [fetchRecordings]); // Removed 'recordings' from here to prevent infinite loop

  const handleUploadToSupabase = useCallback(async (recording: RecordedSession) => {
    if (!user?.id) {
      showError(t("records_page.error_login_to_upload"));
      return;
    }
    if (recording.supabase_url) {
      showError(t("records_page.error_already_uploaded"));
      return;
    }

    showSuccess(t("records_page.uploading_to_cloud"));
    const blob = await getRecordingBlob(recording.id);

    if (!blob) {
      showError(t("records_page.error_no_video_data"));
      return;
    }

    const filePath = `${user.id}/${recording.id}.webm`;
    setUploadProgress(recording.id, 0);
    const { data, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
      }, (event) => {
        setUploadProgress(recording.id, event.percent || 0);
      });

    if (uploadError) {
      showError(`${t("records_page.error_uploading_to_cloud")} ${uploadError.message}`);
      setUploadProgress(recording.id, -1);
      setTimeout(() => removeUploadProgress(recording.id), 3000); // Remove progress on error
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(filePath);
      
      if (publicUrlData.publicUrl) {
        await updateLocalRecordingSupabaseUrl(recording.id, publicUrlData.publicUrl);
        // Also update metadata in Supabase DB
        await upsertRecordingMetadataToSupabase({
          id: recording.id,
          user_id: user.id,
          timestamp: recording.timestamp,
          duration: recording.duration,
          student_id: recording.student_id,
          student_name: recording.student_name,
          student_phone: recording.student_phone,
          supabase_url: publicUrlData.publicUrl,
        });

        setRecordings(prev => prev.map(rec => rec.id === recording.id ? { ...rec, supabase_url: publicUrlData.publicUrl } : rec));
        showSuccess(t("records_page.upload_success"));
        setUploadProgress(recording.id, 100); // Set to 100% briefly
        setTimeout(() => removeUploadProgress(recording.id), 2000); // Then remove progress after a delay
      } else {
        showError(t("records_page.error_getting_public_url"));
        setUploadProgress(recording.id, -1);
        setTimeout(() => removeUploadProgress(recording.id), 3000); // Remove progress on error
      }
    }
  }, [user, t]);

  const handleDownload = useCallback(async (recording: RecordedSession) => {
    setDownloadingRecordId(recording.id); // Set downloading status
    try {
      let urlToDownload = recording.video_url;
      let filename = `recording_${recording.id}.webm`;

      // If local blob is available, prioritize downloading from local
      if (recording.isLocalBlobAvailable && recording.video_url.startsWith('blob:')) {
        urlToDownload = recording.video_url;
        filename = `local_recording_${recording.id}.webm`;
      } else if (recording.supabase_url) {
        urlToDownload = recording.supabase_url;
        filename = `cloud_recording_${recording.id}.webm`;
      } else {
        showError(t("records_page.error_no_video_data"));
        return;
      }

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
      
      const response = await fetch(urlToDownload);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess(t("records_page.success_downloaded")); // New translation key needed
    } catch (error: any) {
      showError(`${t("records_page.error_downloading_video")} ${error.message}`);
    } finally {
      setDownloadingRecordId(null); // Clear downloading status
    }
  }, [t]);

  const handleDelete = useCallback(async (recording: RecordedSession) => {
    try {
      if (recording.isLocalBlobAvailable && recording.video_url.startsWith('blob:')) {
        URL.revokeObjectURL(recording.video_url);
      }
      const localDeleted = await deleteLocalRecording(recording.id); // Get return value
      if (localDeleted) { // Only update state if local deletion was successful
        setRecordings(prev => prev.filter(rec => rec.id !== recording.id));
        showSuccess(t("records_page.success_recording_deleted"));
      }
    } catch (error: any) {
      showError(`${t("records_page.error_deleting_recording")} ${error.message}`);
    }
  }, [t]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader className="relative text-center pt-8"> {/* pt-8 qo'shildi */}
            <Link to="/home" className="absolute left-0 top-0"> {/* top-0 ga o'zgartirildi */}
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("common.back")}
              </Button>
            </Link>
            <CardTitle className="text-3xl font-bold">{t("records_page.your_recordings")}</CardTitle>
            <CardDescription>{t("records_page.review_past_sessions")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? <p className="text-center">{t("common.loading")}</p> : recordings.length === 0 ? (
              <p className="text-muted-foreground text-center">{t("records_page.no_recordings_available")}</p>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording, index) => {
                  const currentUploadProgress = uploadProgress.get(recording.id);
                  const isUploading = currentUploadProgress !== undefined && currentUploadProgress < 100 && currentUploadProgress >= 0;
                  const uploadError = currentUploadProgress === -1;
                  const isDownloading = downloadingRecordId === recording.id;

                  return (
                    <Card key={recording.id} className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="text-left mb-2 sm:mb-0">
                          <h3 className="text-lg font-semibold">
                            {recording.student_name ? `${t("records_page.student")}: ${recording.student_name}` : `${t("records_page.session")} ${recordings.length - index}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(recording.timestamp), "PPP - p")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("records_page.duration")}: {Math.floor(recording.duration / 60)}m {recording.duration % 60}s
                          </p>
                          {recording.supabase_url && (
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                              <CheckCircle2 className="h-3 w-3" /> {t("records_page.uploaded_to_cloud")}
                            </p>
                          )}
                          {uploadError && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                              <Cloud className="h-3 w-3" /> {t("records_page.upload_failed")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                          {/* Play button */}
                          <Button asChild size="sm" className="flex items-center gap-1 w-full sm:w-auto">
                            <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                              <PlayCircle className="h-4 w-4" /> {t("records_page.play")}
                            </a>
                          </Button>

                          {/* Local Download button (conditional) */}
                          {recording.isLocalBlobAvailable && (
                            <Button onClick={() => handleDownload({ ...recording, supabase_url: undefined })} variant="outline" size="sm" className="flex items-center gap-1 w-full sm:w-auto" disabled={isDownloading || isUploading}>
                              <Download className="h-4 w-4" /> {t("records_page.download_local")}
                            </Button>
                          )}
                          
                          {/* Conditional Upload / Uploading / Cloud Download button */}
                          {!recording.supabase_url && user?.id && !isUploading && !uploadError ? (
                            <Button onClick={() => handleUploadToSupabase(recording)} variant="outline" size="sm" className="flex items-center gap-1 w-full sm:w-auto" disabled={isDownloading}>
                              <Cloud className="h-4 w-4" /> {t("records_page.upload")}
                            </Button>
                          ) : isUploading ? (
                            <Button variant="outline" size="sm" className="flex items-center gap-1 relative overflow-hidden w-full sm:w-auto" disabled>
                              <div 
                                className="absolute inset-0 bg-blue-500 opacity-30" 
                                style={{ width: `${currentUploadProgress}%` }}
                              ></div>
                              <span className="relative z-10">{t("records_page.uploading_to_cloud")} {currentUploadProgress?.toFixed(0)}%</span>
                            </Button>
                          ) : recording.supabase_url && (
                            <Button onClick={() => handleDownload(recording)} variant="default" size="sm" className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 w-full sm:w-auto" disabled={isDownloading || isUploading}>
                              {isDownloading ? (
                                <>
                                  <Zap className="h-4 w-4 animate-pulse" /> {t("records_page.downloading")}
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4" /> {t("records_page.download_from_cloud")}
                                </>
                              )}
                            </Button>
                          )}

                          {/* Delete button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="flex items-center gap-1 w-full sm:w-auto" disabled={isDownloading || isUploading}>
                                <Trash2 className="h-4 w-4" /> {t("records_page.delete")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("records_page.delete_recording_confirm_title")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("records_page.delete_recording_confirm_description")}
                                  {recording.supabase_url && (
                                    <span className="block text-red-500 mt-2">{t("records_page.delete_from_cloud_warning")}</span>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("add_question_page.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(recording)}>{t("records_page.delete")}</AlertDialogAction>
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
      <CefrCentreFooter />
    </div>
  );
};

export default Records;