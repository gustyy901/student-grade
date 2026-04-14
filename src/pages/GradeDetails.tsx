import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, GraduationCap } from "lucide-react";

export default function GradeDetails() {
  const { data: students } = useQuery({ queryKey: ["students"], queryFn: studentsAPI.getAll });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectsAPI.getAll });
  const { data: grades } = useQuery({ queryKey: ["grades"], queryFn: gradesAPI.getAll });

  // Group grades by student
  const studentGrades = useMemo(() => {
    if (!students || !grades || !subjects) return [];
    return students.map((student: any) => {
      const studentGradesList = grades.filter((g: any) => g.student_id === student.id);
      const avgScore = studentGradesList.length > 0
        ? studentGradesList.reduce((sum: number, g: any) => sum + Number(g.score), 0) / studentGradesList.length
        : 0;
      return {
        ...student,
        grades: studentGradesList,
        avgScore,
        totalGrades: studentGradesList.length,
      };
    });
  }, [students, grades, subjects]);

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
        <p className="text-sm md:text-base text-muted-foreground">Ringkasan nilai per siswa dan rata-rata</p>
      </div>

      {studentGrades.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Belum ada data</p>
            <p className="text-sm mt-1">Tambahkan siswa dan nilai terlebih dahulu.</p>
          </CardContent>
        </Card>
      ) : (
        studentGrades.map((student: any) => (
          <Card key={student.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <CardDescription>{student.totalGrades} nilai tercatat</CardDescription>
                </div>
                {student.totalGrades > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rata-rata:</span>
                    <Badge variant={getGradeBadge(student.avgScore)} className="text-lg px-3 py-1">
                      {student.avgScore.toFixed(1)} ({getGradeLabel(student.avgScore)})
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {student.grades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm w-12">No</TableHead>
                      <TableHead className="text-xs md:text-sm">Mata Pelajaran</TableHead>
                      <TableHead className="text-right text-xs md:text-sm">Nilai</TableHead>
                      <TableHead className="text-right text-xs md:text-sm">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.grades.map((grade: any, idx: number) => (
                      <TableRow key={grade.id}>
                        <TableCell className="text-xs md:text-sm">{idx + 1}</TableCell>
                        <TableCell className="text-xs md:text-sm">{grade.subject_name}</TableCell>
                        <TableCell className="text-right font-semibold text-xs md:text-sm">{grade.score}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getGradeBadge(grade.score)} className="text-xs">
                            {getGradeLabel(grade.score)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground text-sm">Belum ada nilai untuk siswa ini</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
