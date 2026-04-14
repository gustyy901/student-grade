import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import * as XLSX from "xlsx";

export default function Reports() {
  const [isExporting, setIsExporting] = useState(false);

  const { data: students } = useQuery({ queryKey: ["students"], queryFn: studentsAPI.getAll });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectsAPI.getAll });
  const { data: grades } = useQuery({ queryKey: ["grades"], queryFn: gradesAPI.getAll });

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      if (!students || students.length === 0) {
        toast.error("Tidak ada data untuk diexport");
        return;
      }

      // Summary sheet
      const summaryData = students.map((student: any) => {
        const studentGrades = grades?.filter((g: any) => g.student_id === student.id) || [];
        const avg = studentGrades.length > 0
          ? studentGrades.reduce((sum: number, g: any) => sum + Number(g.score), 0) / studentGrades.length
          : 0;
        return {
          "Nama Siswa": student.name,
          "Jumlah Nilai": studentGrades.length,
          "Rata-rata": avg.toFixed(1),
          "Grade": avg >= 90 ? "A" : avg >= 80 ? "B" : avg >= 70 ? "C" : avg >= 60 ? "D" : avg > 0 ? "E" : "-",
        };
      });

      // Detail sheet
      const detailData = (grades || []).map((g: any) => ({
        "Siswa": g.student_name,
        "Mata Pelajaran": g.subject_name,
        "Nilai": g.score,
      }));

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

      if (detailData.length > 0) {
        const wsDetail = XLSX.utils.json_to_sheet(detailData);
        wsDetail["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 8 }];
        XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Nilai");
      }

      XLSX.writeFile(wb, "Student_Grade_Hub_Report.xlsx");
      toast.success("Data berhasil diexport ke Excel");
    } catch (error) {
      toast.error("Gagal export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const features = [
    "Ringkasan nilai per siswa",
    "Detail semua nilai (sheet terpisah)",
    "Rata-rata dan grade otomatis",
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

      <div className="max-w-lg">
        <Card className="group relative overflow-hidden rounded-2xl border-0 shadow-card hover:shadow-xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg">
                <FileSpreadsheet className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Export Rekap (Excel)</CardTitle>
                <CardDescription className="text-sm mt-1">Download rekapitulasi data nilai</CardDescription>
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
                    Export {students?.length || 0} siswa dan {grades?.length || 0} nilai ke Excel.
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
                    <><FileSpreadsheet className="h-5 w-5 mr-2" />Export ke Excel</>
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
      </div>
    </div>
  );
}
