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
import { getAllRecordingsFromDB, deleteRecordingFromDB, RecordingWithSupabaseUrl } from "@/lib/db"; // Updated import
import { supabase } from "@/lib/supabase"; // Import Supabase client

const SUPABASE_BUCKET_NAME = 'recordings'; // Ensure this matches the recorder hook

const Records: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordedSession[]>([]);

  // Load recordings from IndexedDB on component mount
  useEffect(() => {
    const loadRecordings = async () => {
      const recordingsFromDb: RecordingWithSupabaseUrl[] = await getAllRecordingsFromDB();
      console.log("Records: Loaded recordings from IndexedDB:", recordingsFromDb); // NEW LOG
      // Map to RecordedSession, ensuring 'url' points to 'supabaseUrl'
      const recordingsWithUrls: RecordedSession[] = recordingsFromDb.map(rec => ({
        ...rec,
        url: rec.supabaseUrl, // Use supabaseUrl for the 'url' property
      }));
      setRecordings(recordingsWithUrls);
    };

    loadRecordings();

    // No need to revoke Object URLs here as we are using direct Supabase URLs
    // return () => {
    //   objectUrls.forEach(url => URL.revokeObjectURL(url));
    // };
  }, []);

  const handleDownload = useCallback((recording: RecordedSession) => {
    const timestampFormatted = format(new Date(recording.timestamp), "yyyyMMdd_HHmmss");
    let filename = `mock_test_recording_${timestampFormatted}.webm`;

    if (recording.studentInfo) {
      const studentName = recording.studentInfo.name.replace(/\s/g, '_');
      const studentId = recording.studentInfo.id.replace(/\s/g, '_');
      filename = `mock_test_${studentName}_${studentId}_${timestampFormatted}.webm`;
    }
    
    const a = document.createElement("a");
    a.href = recording.url; // Use the Supabase URL directly
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const deleteVideoFromSupabase = async (supabaseUrl: string) => {
    try {
      // Extract the file path from the public URL
      const urlParts = supabaseUrl.split('/');
      const bucketIndex = urlParts.indexOf(SUPABASE_BUCKET_NAME);
      if (bucketIndex === -1 || bucketIndex + 1 >= urlParts.length) {
        throw new Error("Invalid Supabase URL format for deletion.");
      }
      // The path starts after the bucket name, including 'public/'
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      console.log("Records: Attempting to delete from Supabase Storage. FilePath:", filePath);

      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error("Records: Supabase delete error:", error.message);
        throw error;
      }
      console.log(`Records: Video ${filePath} deleted from Supabase Storage.`);
    } catch (error: any) {
      console.error("Records: Error deleting video from Supabase:", error.message);
      showError(`Videoni Supabase'dan o'chirishda xatolik yuz berdi: ${error.message}`);
    }
  };

  const handleDelete = useCallback(async (timestampToDelete: string, supabaseUrl: string) => {
    try {
      // First, delete from Supabase Storage
      await deleteVideoFromSupabase(supabaseUrl);

      // Then, delete from IndexedDB
      await deleteRecordingFromDB(timestampToDelete);
      
      // Update state
      setRecordings(prevRecordings => prevRecordings.filter(rec => rec.timestamp !== timestampToDelete));

      showSuccess("Yozib olingan sessiya o'chirildi!");
    } catch (error) {
      console.error("Failed to delete recording:", error);
      showError("Yozib olingan videoni o'chirishda xatolik yuz berdi.");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Your Recordings</CardTitle>
            <CardDescription>Review, download, or delete your past mock test sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {recordings.length === 0 ? (
              <p className="text-muted-foreground text-center">No recordings found. Start a mock test to create one!</p>
            ) : (
              <div className="space-y-4">
                {recordings.map((recording, index) => (
                  <Card key={recording.timestamp + index} className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                      <div className="text-left mb-2 sm:mb-0">
                        <h3 className="text-lg font-semibold">
                          {recording.studentInfo?.name ? `O'quvchi: ${recording.studentInfo.name}` : `Yozib olingan sessiya ${recordings.length - index}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(recording.timestamp), "PPP - p")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {Math.floor(recording.duration / 60)}m {recording.duration % 60}s
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const videoWindow = window.open(recording.url, "_blank"); // Use Supabase URL directly
                            if (videoWindow) {
                              videoWindow.focus();
                            } else {
                              showError("Videoni ko'rish uchun pop-uplarga ruxsat bering.");
                            }
                          }}
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <PlayCircle className="h-4 w-4" /> Play
                        </Button>
                        <Button
                          onClick={() => handleDownload(recording)} 
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        <Button
                          onClick={() => handleDelete(recording.timestamp, recording.supabaseUrl)} // Pass supabaseUrl for deletion
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      </div>
                    </div>
                    {recording.studentInfo && (
                      <div className="text-left text-sm text-muted-foreground mt-2 border-t pt-2">
                        <p><strong>ID:</strong> {recording.studentInfo.id}</p>
                        <p><strong>Telefon:</strong> {recording.studentInfo.phone}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
            <p className="text-sm text-red-500 mt-4 text-center">
              Note: Recordings are saved as .webm format. MP4 conversion is not supported directly in the browser.
              These recordings are now stored in Supabase Storage and indexed in your browser's local storage.
            </p>
          </CardContent>
        </Card>
      </main>
      <CefrCentreFooter />
    </div>
  );
};

export default Records;