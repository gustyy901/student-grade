import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Loader2, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import * as XLSX from "xlsx";

const WEIGHTS = {
  tugas: 0.25,
  uts: 0.35,
  uas: 0.40,
};

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score > 0) return "E";
  return "-";
}

export default function Reports() {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const { data: students } = useQuery({ queryKey: ["students"], queryFn: studentsAPI.getAll });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectsAPI.getAll });
  const { data: gradesTugas } = useQuery({ queryKey: ["grades", "tugas"], queryFn: gradesAPI.getAllTugas });
  const { data: gradesUts } = useQuery({ queryKey: ["grades", "uts"], queryFn: gradesAPI.getAllUts });
  const { data: gradesUas } = useQuery({ queryKey: ["grades", "uas"], queryFn: gradesAPI.getAllUas });

  const getStudentName = (studentId: string) => {
    return students?.find((s: any) => s.id === studentId)?.nama || "Unknown";
  };

  const getSubjectName = (subjectId: string) => {
    return subjects?.find((s: any) => s.id === subjectId)?.nama_mapel || "Unknown";
  };

  const studentGradesSummary = useMemo(() => {
    if (!students) return [];

    return students.map((student: any) => {
      const tugas = gradesTugas?.filter((g: any) => g.student_id === student.id) || [];
      const uts = gradesUts?.filter((g: any) => g.student_id === student.id) || [];
      const uas = gradesUas?.filter((g: any) => g.student_id === student.id) || [];

      const tugasAvg = tugas.length > 0 ? tugas.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / tugas.length : 0;
      const utsAvg = uts.length > 0 ? uts.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / uts.length : 0;
      const uasAvg = uas.length > 0 ? uas.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / uas.length : 0;

      const weightedAvg = tugasAvg * WEIGHTS.tugas + utsAvg * WEIGHTS.uts + uasAvg * WEIGHTS.uas;

      return {
        "Nama Siswa": student.nama,
        "NIS": student.nis || "-",
        "Kelas": student.kelas || "-",
        "Rata-rata Tugas": tugasAvg > 0 ? tugasAvg.toFixed(2) : "-",
        "Rata-rata UTS": utsAvg > 0 ? utsAvg.toFixed(2) : "-",
        "Rata-rata UAS": uasAvg > 0 ? uasAvg.toFixed(2) : "-",
        "Nilai Akhir": weightedAvg > 0 ? weightedAvg.toFixed(2) : "-",
        "Grade": weightedAvg > 0 ? getGrade(weightedAvg) : "-",
        "Jumlah Nilai": tugas.length + uts.length + uas.length,
      };
    });
  }, [students, gradesTugas, gradesUts, gradesUas]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      if (!students || students.length === 0) {
        toast.error("Tidak ada data untuk diexport");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Summary sheet with weighted average
      const wsSummary = XLSX.utils.json_to_sheet(studentGradesSummary);
      wsSummary["!cols"] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

      // Detail Tugas sheet
      if (gradesTugas && gradesTugas.length > 0) {
        const tugasData = gradesTugas.map((g: any) => ({
          "Siswa": getStudentName(g.student_id),
          "Mata Pelajaran": getSubjectName(g.mapel_id),
          "Semester": g.semester,
          "Nilai Tugas": g.nilai,
        }));
        const wsTugas = XLSX.utils.json_to_sheet(tugasData);
        wsTugas["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsTugas, "Detail Tugas");
      }

      // Detail UTS sheet
      if (gradesUts && gradesUts.length > 0) {
        const utsData = gradesUts.map((g: any) => ({
          "Siswa": getStudentName(g.student_id),
          "Mata Pelajaran": getSubjectName(g.mapel_id),
          "Semester": g.semester,
          "Nilai UTS": g.nilai,
        }));
        const wsUts = XLSX.utils.json_to_sheet(utsData);
        wsUts["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsUts, "Detail UTS");
      }

      // Detail UAS sheet
      if (gradesUas && gradesUas.length > 0) {
        const uasData = gradesUas.map((g: any) => ({
          "Siswa": getStudentName(g.student_id),
          "Mata Pelajaran": getSubjectName(g.mapel_id),
          "Semester": g.semester,
          "Nilai UAS": g.nilai,
        }));
        const wsUas = XLSX.utils.json_to_sheet(uasData);
        wsUas["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsUas, "Detail UAS");
      }

      XLSX.writeFile(wb, "Student_Grade_Hub_Report.xlsx");
      toast.success("Data berhasil diexport ke Excel");
    } catch (error) {
      console.error(error);
      toast.error("Gagal export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingleStudent = async () => {
    if (!selectedStudentId) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }

    setIsExporting(true);
    try {
      const student = students?.find((s: any) => s.id === selectedStudentId);
      if (!student) {
        toast.error("Siswa tidak ditemukan");
        return;
      }

      const tugas = gradesTugas?.filter((g: any) => g.student_id === selectedStudentId) || [];
      const uts = gradesUts?.filter((g: any) => g.student_id === selectedStudentId) || [];
      const uas = gradesUas?.filter((g: any) => g.student_id === selectedStudentId) || [];

      const tugasAvg = tugas.length > 0 ? tugas.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / tugas.length : 0;
      const utsAvg = uts.length > 0 ? uts.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / uts.length : 0;
      const uasAvg = uas.length > 0 ? uas.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / uas.length : 0;
      const weightedAvg = tugasAvg * WEIGHTS.tugas + utsAvg * WEIGHTS.uts + uasAvg * WEIGHTS.uas;

      // Summary data
      const summaryData = [{
        "Nama Siswa": student.nama,
        "NIS": student.nis || "-",
        "Kelas": student.kelas || "-",
        "Rata-rata Tugas": tugasAvg > 0 ? tugasAvg.toFixed(2) : "-",
        "Rata-rata UTS": utsAvg > 0 ? utsAvg.toFixed(2) : "-",
        "Rata-rata UAS": uasAvg > 0 ? uasAvg.toFixed(2) : "-",
        "Nilai Akhir": weightedAvg > 0 ? weightedAvg.toFixed(2) : "-",
        "Grade": weightedAvg > 0 ? getGrade(weightedAvg) : "-",
        "Jumlah Nilai": tugas.length + uts.length + uas.length,
      }];

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

      // Detail Tugas
      if (tugas.length > 0) {
        const tugasData = tugas.map((g: any) => ({
          "Mata Pelajaran": getSubjectName(g.mapel_id),
          "Semester": g.semester,
          "Nilai Tugas": g.nilai,
        }));
        const wsTugas = XLSX.utils.json_to_sheet(tugasData);
        wsTugas["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsTugas, "Detail Tugas");
      }

      // Detail UTS
      if (uts.length > 0) {
        const utsData = uts.map((g: any) => ({
          "Mata Pelajaran": getSubjectName(g.mapel_id),
          "Semester": g.semester,
          "Nilai UTS": g.nilai,
        }));
        const wsUts = XLSX.utils.json_to_sheet(utsData);
        wsUts["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsUts, "Detail UTS");
      }

      // Detail UAS
      if (uas.length > 0) {
        const uasData = uas.map((g: any) => ({
          "Mata Pelajaran": getSubjectName(g.mapel_id),
          "Semester": g.semester,
          "Nilai UAS": g.nilai,
        }));
        const wsUas = XLSX.utils.json_to_sheet(uasData);
        wsUas["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsUas, "Detail UAS");
      }

      XLSX.writeFile(wb, `${student.nama}_Laporan_Nilai.xlsx`);
      toast.success(`Laporan ${student.nama} berhasil diexport`);
    } catch (error) {
      console.error(error);
      toast.error("Gagal export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const features = [
    "Ringkasan nilai per siswa dengan weighted average",
    "Detail nilai Tugas, UTS, UAS (sheet terpisah)",
    "Grade otomatis berdasarkan skala A-E",
    "NIS, Kelas, dan informasi siswa lengkap",
    "Ready untuk analisis pivot table",
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Download className="h-6 w-6 text-white" />
          </div>
          <h2 className="page-title">Laporan & Export</h2>
        </div>
        <p className="page-description">Export data nilai siswa dalam format Excel</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Export Semua Siswa */}
        <Card className="group relative overflow-hidden rounded-2xl border-0 shadow-card hover:shadow-xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Export Semua Siswa</CardTitle>
                <CardDescription className="text-sm mt-1">Download rekapitulasi data nilai semua siswa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-5">
            {(!students || students.length === 0) ? (
              <div className="p-4 rounded-xl bg-muted/50 text-center text-muted-foreground">
                <p>Belum ada data untuk diexport.</p>
                <p className="text-sm mt-1">Tambahkan siswa dan nilai terlebih dahulu.</p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                  <p className="text-sm text-muted-foreground">
                    Export {students?.length || 0} siswa, {gradesTugas?.length || 0} Tugas, {gradesUts?.length || 0} UTS, dan {gradesUas?.length || 0} UAS ke Excel.
                  </p>
                </div>
                <Button
                  onClick={handleExportExcel}
                  className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sedang Export...</>
                  ) : (
                    <><FileSpreadsheet className="h-5 w-5 mr-2" />Export Semua</>
                  )}
                </Button>
              </>
            )}
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground mb-3">File Excel berisi:</p>
              <ul className="space-y-2">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Export Satu Siswa */}
        <Card className="group relative overflow-hidden rounded-2xl border-0 shadow-card hover:shadow-xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Export Satu Siswa</CardTitle>
                <CardDescription className="text-sm mt-1">Download laporan nilai untuk satu siswa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-5">
            {(!students || students.length === 0) ? (
              <div className="p-4 rounded-xl bg-muted/50 text-center text-muted-foreground">
                <p>Belum ada siswa untuk diexport.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Pilih Siswa</label>
                  <Select value={selectedStudentId || ""} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="h-11 rounded-xl border-border/50">
                      <SelectValue placeholder="Pilih siswa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.nama} ({student.nis})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleExportSingleStudent}
                  className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
                  disabled={isExporting || !selectedStudentId}
                >
                  {isExporting ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sedang Export...</>
                  ) : (
                    <><Download className="h-5 w-5 mr-2" />Export Laporan Siswa</>
                  )}
                </Button>
              </>
            )}
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground mb-3">File akan berisi:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  Ringkasan nilai untuk 1 siswa
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  Detail nilai Tugas, UTS, UAS
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  Total nilai akhir & grade
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
