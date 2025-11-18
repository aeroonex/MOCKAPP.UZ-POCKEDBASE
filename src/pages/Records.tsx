"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle, Trash2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { RecordedSession } from "@/lib/types";
import { showError, showSuccess } from "@/utils/toast";
import { getLocalRecordings, deleteLocalRecording } from "@/lib/local-db";
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

const Records: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    let loadedRecordings: RecordedSession[] = [];

    const fetchRecordings = async () => {
      setIsLoading(true);
      try {
        const data = await getLocalRecordings();
        if (isMounted) {
          loadedRecordings = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRecordings(loadedRecordings);
        }
      } catch (error: any) {
        showError(`${t("records_page.error_loading_recordings")} ${error.message}`);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    fetchRecordings();

    return () => {
      isMounted = false;
      loadedRecordings.forEach(rec => URL.revokeObjectURL(rec.video_url));
    };
  }, [t]);

  const handleDownload = useCallback(async (recording: RecordedSession) => {
    try {
      const response = await fetch(recording.video_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      
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
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showError(`${t("records_page.error_downloading_video")} ${error.message}`);
    }
  }, [t]);

  const handleDelete = useCallback(async (recording: RecordedSession) => {
    try {
      URL.revokeObjectURL(recording.video_url);
      await deleteLocalRecording(recording.id);
      setRecordings(prev => prev.filter(rec => rec.id !== recording.id));
      showSuccess(t("records_page.success_recording_deleted"));
    } catch (error: any) {
      showError(`${t("records_page.error_deleting_recording")} ${error.message}`);
    }
  }, [t]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader className="relative text-center">
            <Link to="/home" className="absolute left-0 top-4">
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
                {recordings.map((recording, index) => (
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
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <Button asChild size="sm" className="flex items-center gap-1">
                          <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="h-4 w-4" /> {t("records_page.play")}
                          </a>
                        </Button>
                        <Button onClick={() => handleDownload(recording)} variant="outline" size="sm" className="flex items-center gap-1">
                          <Download className="h-4 w-4" /> {t("records_page.download")}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex items-center gap-1">
                              <Trash2 className="h-4 w-4" /> {t("records_page.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("records_page.delete_recording_confirm_title")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("records_page.delete_recording_confirm_description")}
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
                ))}
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