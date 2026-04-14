import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, GraduationCap } from "lucide-react";

const WEIGHTS = {
  tugas: 0.25, // 25%
  uts: 0.35,   // 35%
  uas: 0.40,   // 40%
};

export default function GradeDetails() {
  const [detailView, setDetailView] = useState<"summary" | "tugas" | "uts" | "uas">("summary");
  
  const { data: students, isLoading: isLoadingStudents } = useQuery({ queryKey: ["students"], queryFn: studentsAPI.getAll });
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectsAPI.getAll });
  const { data: gradesTugas } = useQuery({ queryKey: ["grades", "tugas"], queryFn: gradesAPI.getAllTugas });
  const { data: gradesUts } = useQuery({ queryKey: ["grades", "uts"], queryFn: gradesAPI.getAllUts });
  const { data: gradesUas } = useQuery({ queryKey: ["grades", "uas"], queryFn: gradesAPI.getAllUas });

  const isLoading = isLoadingStudents || isLoadingSubjects;

  // Helper function untuk get subject name
  const getSubjectName = (mapelId: string) => {
    return subjects?.find((s: any) => s.id === mapelId)?.nama_mapel || mapelId;
  };

  // Calculate weighted average
  const calculateWeightedAverage = (tugas: number, uts: number, uas: number) => {
    const hasAllGrades = tugas >= 0 && uts >= 0 && uas >= 0;
    if (!hasAllGrades) return null;
    return (tugas * WEIGHTS.tugas) + (uts * WEIGHTS.uts) + (uas * WEIGHTS.uas);
  };

  // Get average score per type for each student
  const studentGrades = useMemo(() => {
    if (!students) return [];
    return students.map((student: any) => {
      // Get tugas average
      const tugasList = (gradesTugas || []).filter((g: any) => g.student_id === student.id)
        .map((g: any) => Number(g.nilai || 0));
      const tugasAvg = tugasList.length > 0 ? tugasList.reduce((a, b) => a + b) / tugasList.length : null;

      // Get UTS average
      const utsList = (gradesUts || []).filter((g: any) => g.student_id === student.id)
        .map((g: any) => Number(g.nilai || 0));
      const utsAvg = utsList.length > 0 ? utsList.reduce((a, b) => a + b) / utsList.length : null;

      // Get UAS average
      const uasList = (gradesUas || []).filter((g: any) => g.student_id === student.id)
        .map((g: any) => Number(g.nilai || 0));
      const uasAvg = uasList.length > 0 ? uasList.reduce((a, b) => a + b) / uasList.length : null;

      // Calculate weighted average
      const weightedAvg = calculateWeightedAverage(tugasAvg || 0, utsAvg || 0, uasAvg || 0);

      return {
        ...student,
        tugasAvg: tugasAvg ? Math.round(tugasAvg * 100) / 100 : null,
        utsAvg: utsAvg ? Math.round(utsAvg * 100) / 100 : null,
        uasAvg: uasAvg ? Math.round(uasAvg * 100) / 100 : null,
        weightedAvg: weightedAvg ? Math.round(weightedAvg * 100) / 100 : null,
        tugasCount: tugasList.length,
        utsCount: utsList.length,
        uasCount: uasList.length,
        allGrades: {
          tugas: (gradesTugas || []).filter((g: any) => g.student_id === student.id),
          uts: (gradesUts || []).filter((g: any) => g.student_id === student.id),
          uas: (gradesUas || []).filter((g: any) => g.student_id === student.id),
        }
      };
    });
  }, [students, gradesTugas, gradesUts, gradesUas]);

  const getGradeBadge = (score: number): "default" | "secondary" | "outline" | "destructive" => {
    if (score >= 90) return "default";
    if (score >= 80) return "secondary";
    if (score >= 70) return "outline";
    return "destructive";
  };

  const getGradeLabel = (score: number) => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "E";
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <FileText className="h-6 w-6 md:h-8 md:w-8" />
          Detail Nilai Siswa
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">Ringkasan nilai per siswa dengan weighted average</p>
        
        {/* View tabs */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <Button 
            variant={detailView === "summary" ? "default" : "outline"} 
            onClick={() => setDetailView("summary")}
            className="text-sm"
          >
            Ringkasan
          </Button>
          <Button 
            variant={detailView === "tugas" ? "default" : "outline"} 
            onClick={() => setDetailView("tugas")}
            className="text-sm"
          >
            Detail Tugas
          </Button>
          <Button 
            variant={detailView === "uts" ? "default" : "outline"} 
            onClick={() => setDetailView("uts")}
            className="text-sm"
          >
            Detail UTS
          </Button>
          <Button 
            variant={detailView === "uas" ? "default" : "outline"} 
            onClick={() => setDetailView("uas")}
            className="text-sm"
          >
            Detail UAS
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <p>Memuat data...</p>
          </CardContent>
        </Card>
      ) : studentGrades.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Belum ada data</p>
            <p className="text-sm mt-1">Tambahkan siswa dan nilai terlebih dahulu.</p>
          </CardContent>
        </Card>
      ) : detailView === "summary" ? (
        /* SUMMARY VIEW */
        studentGrades.map((student: any) => (
          <Card key={student.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{student.nama}</CardTitle>
                  <CardDescription className="text-sm">
                    Tugas: {student.tugasCount} | UTS: {student.utsCount} | UAS: {student.uasCount}
                  </CardDescription>
                </div>
                {student.weightedAvg !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Nilai Akhir:</span>
                    <Badge variant={getGradeBadge(student.weightedAvg)} className="text-lg px-3 py-1">
                      {student.weightedAvg.toFixed(2)} ({getGradeLabel(student.weightedAvg)})
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Rata-rata Tugas (25%)</p>
                  <p className="text-2xl font-bold">{student.tugasAvg !== null ? student.tugasAvg.toFixed(2) : '-'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Rata-rata UTS (35%)</p>
                  <p className="text-2xl font-bold">{student.utsAvg !== null ? student.utsAvg.toFixed(2) : '-'}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Rata-rata UAS (40%)</p>
                  <p className="text-2xl font-bold">{student.uasAvg !== null ? student.uasAvg.toFixed(2) : '-'}</p>
                </div>
                <div className="border rounded-lg p-3 bg-blue-50">
                  <p className="text-xs text-muted-foreground mb-1">Nilai Akhir (Weighted)</p>
                  <p className="text-2xl font-bold text-blue-600">{student.weightedAvg !== null ? student.weightedAvg.toFixed(2) : '-'}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Rumus: (Tugas × 25%) + (UTS × 35%) + (UAS × 40%)
              </p>
            </CardContent>
          </Card>
        ))
      ) : (
        /* DETAIL VIEW (TUGAS/UTS/UAS) */
        studentGrades.map((student: any) => {
          const gradesList = detailView === "tugas" ? student.allGrades.tugas : 
                            detailView === "uts" ? student.allGrades.uts : 
                            student.allGrades.uas;
          const avgScore = detailView === "tugas" ? student.tugasAvg :
                          detailView === "uts" ? student.utsAvg :
                          student.uasAvg;
          const typeName = detailView === "tugas" ? "Tugas" : detailView === "uts" ? "UTS" : "UAS";
          
          return (
            <Card key={`${student.id}-${detailView}`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{student.nama}</CardTitle>
                    <CardDescription>Nilai {typeName}: {gradesList.length} data</CardDescription>
                  </div>
                  {avgScore !== null && (
                    <Badge variant={getGradeBadge(avgScore)} className="text-lg px-3 py-1">
                      {avgScore.toFixed(2)} ({getGradeLabel(avgScore)})
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {gradesList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm w-12">No</TableHead>
                        <TableHead className="text-xs md:text-sm">Mata Pelajaran</TableHead>
                        <TableHead className="text-xs md:text-sm">Semester</TableHead>
                        <TableHead className="text-right text-xs md:text-sm">Nilai</TableHead>
                        <TableHead className="text-right text-xs md:text-sm">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradesList.map((grade: any, idx: number) => (
                        <TableRow key={grade.id}>
                          <TableCell className="text-xs md:text-sm">{idx + 1}</TableCell>
                          <TableCell className="text-xs md:text-sm">{getSubjectName(grade.mapel_id)}</TableCell>
                          <TableCell className="text-xs md:text-sm">Sem {grade.semester}</TableCell>
                          <TableCell className="text-right font-semibold text-xs md:text-sm">{grade.nilai}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getGradeBadge(grade.nilai)} className="text-xs">
                              {getGradeLabel(grade.nilai)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">Belum ada nilai {typeName} untuk siswa ini</p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
