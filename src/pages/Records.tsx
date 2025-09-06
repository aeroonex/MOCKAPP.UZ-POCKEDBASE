"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { CefrCentreFooter } from "@/components/CefrCentreFooter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, PlayCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { RecordedSession } from "@/lib/types";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const Records: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      showError(`Yozuvlarni yuklashda xatolik: ${error.message}`);
    } else {
      setRecordings(data as RecordedSession[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const isGuest = localStorage.getItem("isGuestMode") === "true";
    if (isGuest) {
      showError("Mehmon rejimida yozuvlar saqlanmaydi va ko'rsatilmaydi.");
      setIsLoading(false);
      return;
    }
    fetchRecordings();
  }, [fetchRecordings]);

  const handleDownload = useCallback((recording: RecordedSession) => {
    const a = document.createElement("a");
    a.href = recording.video_url;
    a.target = "_blank"; // Open in new tab to let browser handle download
    a.download = `recording_${recording.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDelete = useCallback(async (recording: RecordedSession) => {
    try {
      // Delete from Storage
      const url = new URL(recording.video_url);
      const filePath = url.pathname.split('/recordings/')[1];
      if (filePath) {
        const { error: storageError } = await supabase.storage.from('recordings').remove([filePath]);
        if (storageError) throw storageError;
      }

      // Delete from Database
      const { error: dbError } = await supabase.from('recordings').delete().eq('id', recording.id);
      if (dbError) throw dbError;

      setRecordings(prev => prev.filter(rec => rec.id !== recording.id));
      showSuccess("Yozuv muvaffaqiyatli o'chirildi!");
    } catch (error: any) {
      showError(`Yozuvni o'chirishda xatolik: ${error.message}`);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Your Recordings</CardTitle>
            <CardDescription>O'tgan mock test sessiyalaringizni ko'rib chiqing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? <p className="text-center">Yuklanmoqda...</p> : recordings.length === 0 ? (
              <p className="text-muted-foreground text-center">Hali yozuvlar mavjud emas.</p>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording, index) => (
                  <Card key={recording.id} className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="text-left mb-2 sm:mb-0">
                        <h3 className="text-lg font-semibold">
                          {recording.student_name ? `O'quvchi: ${recording.student_name}` : `Sessiya ${recordings.length - index}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(recording.timestamp), "PPP - p")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Davomiyligi: {Math.floor(recording.duration / 60)}m {recording.duration % 60}s
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <Button asChild size="sm" className="flex items-center gap-1">
                          <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="h-4 w-4" /> Play
                          </a>
                        </Button>
                        <Button onClick={() => handleDownload(recording)} variant="outline" size="sm" className="flex items-center gap-1">
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        <Button onClick={() => handleDelete(recording)} variant="destructive" size="sm" className="flex items-center gap-1">
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </div>
                    {recording.student_name && (
                      <div className="text-left text-sm text-muted-foreground mt-2 border-t pt-2">
                        <p><strong>ID:</strong> {recording.student_id}</p>
                        <p><strong>Telefon:</strong> {recording.student_phone}</p>
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