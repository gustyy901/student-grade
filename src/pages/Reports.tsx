import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import * as XLSX from "xlsx";

// Constants
const WEIGHTS = { tugas: 0.25, uts: 0.35, uas: 0.40 };

// Utility Functions
const getGrade = (score: number): string => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score > 0) return "E";
  return "-";
};

const calculateAverages = (grades: any[] | undefined) => ({
  average: (grades?.length ?? 0) > 0 ? grades!.reduce((sum: number, g: any) => sum + Number(g.nilai), 0) / grades!.length : 0,
  count: grades?.length ?? 0,
});

const createExcelWorkbook = (data: any, fileName: string) => {
  const wb = XLSX.utils.book_new();
  Object.entries(data).forEach(([sheetName, sheetData]: [string, any]) => {
    if (sheetData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = sheetData[0] ? Object.keys(sheetData[0]).map(() => ({ wch: 20 })) : [];
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });
  XLSX.writeFile(wb, fileName);
};

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
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen">
      <div className="page-header mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
            <FileSpreadsheet className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="page-title text-3xl font-bold">Laporan & Export</h2>
            <p className="page-description text-base mt-1">Kelola dan ekspor data nilai siswa dalam format Excel</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
        {/* Export Semua Siswa */}
        <Card className="group relative overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-teal-300/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative pb-6 border-b border-emerald-200/30 dark:border-emerald-900/30">
            <div className="flex items-start gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Export Semua Siswa</CardTitle>
                <CardDescription className="text-sm mt-2 text-gray-600 dark:text-gray-300">Unduh rekapitulasi lengkap nilai semua siswa dalam satu file Excel dengan 4 sheet</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-5 pt-6">
            {(!students || students.length === 0) ? (
              <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-center">
                <AlertCircle className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                <p className="font-medium text-amber-900 dark:text-amber-200">Belum ada data untuk diexport</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Tambahkan siswa dan nilai terlebih dahulu untuk melihat opsi export</p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-300/40 dark:border-emerald-900/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Data Siap Diexport</p>
                      <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100 mt-1">{students?.length || 0} Siswa • {(gradesTugas?.length || 0) + (gradesUts?.length || 0) + (gradesUas?.length || 0)} Total Nilai</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Breakdown:</p>
                      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">📝 {gradesTugas?.length || 0} | 📋 {gradesUts?.length || 0} | 📄 {gradesUas?.length || 0}</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleExportExcel}
                  className="w-full h-12 rounded-xl font-semibold text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-300 text-white border-0"
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sedang Memproses...</>
                  ) : (
                    <><FileSpreadsheet className="h-5 w-5 mr-2" />Unduh Semua Data ke Excel</>
                  )}
                </Button>
              </>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="font-semibold text-sm text-foreground">Konten File Excel:</p>
              </div>
              <ul className="space-y-2.5 ml-7">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Ringkasan nilai semua siswa dengan weighted average</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Sheet terpisah untuk Detail Tugas, UTS, dan UAS</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Grade otomatis berdasarkan skala A-E</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>Informasi lengkap: NIS, Kelas, Rata-rata per tipe</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Export Satu Siswa */}
        <Card className="group relative overflow-hidden rounded-3xl border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-300/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative pb-6 border-b border-blue-200/30 dark:border-blue-900/30">
            <div className="flex items-start gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-xl">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Export Satu Siswa</CardTitle>
                <CardDescription className="text-sm mt-2 text-gray-600 dark:text-gray-300">Unduh laporan nilai lengkap untuk siswa tertentu dengan detail sempurna</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-5 pt-6">
            {(!students || students.length === 0) ? (
              <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-center">
                <AlertCircle className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                <p className="font-medium text-amber-900 dark:text-amber-200">Belum ada siswa tersedia</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Tambahkan siswa terlebih dahulu untuk menggunakan fitur ini</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-3 block">📌 Pilih Siswa</label>
                    <Select value={selectedStudentId || ""} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="h-12 rounded-2xl border border-blue-200/50 dark:border-blue-900/50 bg-white dark:bg-slate-900 hover:border-blue-400/50 transition-colors">
                        <SelectValue placeholder="Tekan untuk memilih siswa..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {students?.map((student: any) => (
                          <SelectItem key={student.id} value={student.id} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{student.nama}</span>
                              <span className="text-gray-500">({student.nis})</span>
                              {student.kelas && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{student.kelas}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStudentId && students && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-300/40 dark:border-blue-900/50">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Siswa Dipilih</p>
                      <p className="font-semibold text-blue-900 dark:text-blue-100 mt-1">{students.find((s: any) => s.id === selectedStudentId)?.nama}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">NIS: {students.find((s: any) => s.id === selectedStudentId)?.nis} • Kelas: {students.find((s: any) => s.id === selectedStudentId)?.kelas}</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleExportSingleStudent}
                  className="w-full h-12 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all duration-300 text-white border-0"
                  disabled={isExporting || !selectedStudentId}
                >
                  {isExporting ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Sedang Memproses...</>
                  ) : (
                    <><Download className="h-5 w-5 mr-2" />Unduh Laporan Siswa</>
                  )}
                </Button>
              </>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <p className="font-semibold text-sm text-foreground">File berisi informasi:</p>
              </div>
              <ul className="space-y-2.5 ml-7">
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>Ringkasan lengkap untuk 1 siswa saja</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>Detail nilai Tugas, UTS, dan UAS terpisah</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>Total nilai akhir dengan grade letter</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>Format: {selectedStudentId && students ? `${students.find((s: any) => s.id === selectedStudentId)?.nama}_Laporan_Nilai.xlsx` : "NamaSiswa_Laporan_Nilai.xlsx"}</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
