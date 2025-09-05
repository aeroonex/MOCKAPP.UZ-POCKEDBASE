"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";

interface StudentInfoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentId: string, studentName: string, studentPhone: string) => void;
}

const StudentInfoForm: React.FC<StudentInfoFormProps> = ({ isOpen, onClose, onSave }) => {
  console.log("StudentInfoForm: isOpen prop received:", isOpen); // NEW LOG
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [studentPhone, setStudentPhone] = useState<string>("");

  const handleSubmit = () => {
    if (!studentId.trim() || !studentName.trim() || !studentPhone.trim()) {
      showError("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }
    onSave(studentId.trim(), studentName.trim(), studentPhone.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>O'quvchi ma'lumotlarini kiriting</DialogTitle>
          <DialogDescription>
            Testni boshlashdan oldin o'quvchi ID, ism va telefon raqamini kiriting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentId" className="text-right">
              ID
            </Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="col-span-3"
              placeholder="O'quvchi ID raqami"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentName" className="text-right">
              Ism
            </Label>
            <Input
              id="studentName"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="col-span-3"
              placeholder="O'quvchi ismi"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="studentPhone" className="text-right">
              Telefon
            </Label>
            <Input
              id="studentPhone"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              className="col-span-3"
              placeholder="Telefon raqami"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Testni boshlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentInfoForm;