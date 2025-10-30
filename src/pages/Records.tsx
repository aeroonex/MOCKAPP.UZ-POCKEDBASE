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

const Records: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        showError(`Yozuvlarni yuklashda xatolik: ${error.message}`);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    fetchRecordings();

    // Cleanup function to run when the component unmounts
    return () => {
      isMounted = false;
      // Revoke the temporary URLs to prevent memory leaks
      loadedRecordings.forEach(rec => URL.revokeObjectURL(rec.video_url));
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  const handleDownload = useCallback(async (recording: RecordedSession) => {
    try {
      const response = await fetch(recording.video_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      
      // Fayl nomini o'quvchi ismi va telefon raqami bilan shakllantirish
      let filename = `recording_${recording.id}.webm`; // Default nom
      if (recording.student_name && recording.student_phone) {
        // Ism va telefon raqamidagi bo'shliqlarni va maxsus belgilarni almashtirish
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
      URL.revokeObjectURL(url); // URL ni tozalash
    } catch (error: any) {
      showError(`Videoni yuklashda xatolik: ${error.message}`);
    }
  }, []);

  const handleDelete = useCallback(async (recording: RecordedSession) => {
    try {
      // First, revoke the temporary URL to free up memory
      URL.revokeObjectURL(recording.video_url);
      // Then, delete the record from IndexedDB
      await deleteLocalRecording(recording.id);
      // Finally, update the state to remove the item from the UI
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
          <CardHeader className="relative text-center">
            <Link to="/home" className="absolute left-0 top-4">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
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