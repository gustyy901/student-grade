import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminAPI, dashboardAPI, studentsAPI, gradesAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Shield,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function AdminDashboard() {
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [searchStudent, setSearchStudent] = useState<string>("");

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardAPI.getStats,
  });

  const { data: summary } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: adminAPI.getSummary,
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: adminAPI.getTeachers,
  });

  const { data: students } = useQuery({
    queryKey: ["all-students"],
    queryFn: studentsAPI.getAll,
  });

  const { data: grades } = useQuery({
    queryKey: ["all-grades"],
    queryFn: gradesAPI.getAll,
  });

  const allGrades = useMemo(() => {
    if (!grades) return [];
    let filtered = [...grades];
    if (selectedTeacher && selectedTeacher !== "all") {
      filtered = filtered.filter((g: any) => String(g.user_id) === selectedTeacher);
    }
    return filtered;
  }, [grades, selectedTeacher]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    let filtered = [...students];
    if (selectedTeacher && selectedTeacher !== "all") {
      filtered = filtered.filter((s: any) => String(s.user_id) === selectedTeacher);
    }
    if (searchStudent.trim()) {
      filtered = filtered.filter((s: any) =>
        s.nama.toLowerCase().includes(searchStudent.toLowerCase())
      );
    }
    return filtered;
  }, [students, selectedTeacher, searchStudent]);

  const gradeDistribution = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    allGrades.forEach((g: any) => {
      const s = Number(g.score);
      if (s >= 90) dist.A++;
      else if (s >= 80) dist.B++;
      else if (s >= 70) dist.C++;
      else if (s >= 60) dist.D++;
      else dist.E++;
    });
    return [
      { name: "A (90-100)", value: dist.A },
      { name: "B (80-89)", value: dist.B },
      { name: "C (70-79)", value: dist.C },
      { name: "D (60-69)", value: dist.D },
      { name: "E (<60)", value: dist.E },
    ];
  }, [allGrades]);

  const statCards = [
    {
      title: "Total Guru",
      value: summary?.totalTeachers || 0,
      icon: Users,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-500/10 to-purple-600/10",
    },
    {
      title: "Total Siswa",
      value: summary?.totalStudents || 0,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/10",
    },
    {
      title: "Mata Pelajaran",
      value: summary?.totalSubjects || 0,
      icon: BookOpen,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/10",
    },
    {
      title: "Total Nilai",
      value: summary?.totalGrades || 0,
      icon: ClipboardList,
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-500/10 to-orange-600/10",
    },
  ];

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Kelola semua data siswa, guru, dan nilai</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              className="border-border/50 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.bgGradient}`}>
                    <Icon className={`h-4 w-4 bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribusi Nilai
            </CardTitle>
            <CardDescription>Persentase siswa per grade</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: "12px" }} />
                <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#f3f4f6" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {gradeDistribution.map((_: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grade Pie Chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Komposisi Grade
            </CardTitle>
            <CardDescription>Jumlah siswa per kategori nilai</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradeDistribution.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="teacher-filter">Pilih Guru</Label>
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger id="teacher-filter">
              <SelectValue placeholder="Semua guru" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua guru</SelectItem>
              {teachers?.map((teacher: any) => (
                <SelectItem key={teacher.id} value={String(teacher.id)}>
                  {teacher.name} ({teacher.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="student-search">Cari Siswa</Label>
          <Input
            id="student-search"
            placeholder="Cari berdasarkan nama siswa..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
          />
        </div>
      </div>

      {/* Students Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Daftar Siswa
          </CardTitle>
          <CardDescription>
            Menampilkan {filteredStudents.length} dari {students?.length || 0} siswa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/40">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama Siswa</TableHead>
                  <TableHead className="font-semibold">Guru</TableHead>
                  <TableHead className="font-semibold">Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student: any, idx: number) => {
                    const teacher = teachers?.find((t: any) => t.id === student.user_id);
                    return (
                      <TableRow key={student.id} className="border-border/50 hover:bg-muted/40">
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{student.nama}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{teacher?.name || "Unknown"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(student.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Tidak ada siswa yang ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Daftar Semua Nilai
          </CardTitle>
          <CardDescription>
            Menampilkan {allGrades.length} dari {grades?.length || 0} nilai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-muted/40">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Siswa</TableHead>
                  <TableHead className="font-semibold">Mata Pelajaran</TableHead>
                  <TableHead className="font-semibold">Guru</TableHead>
                  <TableHead className="font-semibold">Nilai</TableHead>
                  <TableHead className="font-semibold">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGrades.length > 0 ? (
                  allGrades.map((grade: any, idx: number) => {
                    const scoreNum = Number(grade.nilai);
                    let gradeLabel = "E";
                    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "destructive";

                    if (scoreNum >= 90) {
                      gradeLabel = "A";
                      badgeVariant = "default";
                    } else if (scoreNum >= 80) {
                      gradeLabel = "B";
                      badgeVariant = "secondary";
                    } else if (scoreNum >= 70) {
                      gradeLabel = "C";
                      badgeVariant = "outline";
                    } else if (scoreNum >= 60) {
                      gradeLabel = "D";
                      badgeVariant = "outline";
                    }

                    return (
                      <TableRow key={grade.id} className="border-border/50 hover:bg-muted/40">
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{grade.student_name || "-"}</TableCell>
                        <TableCell>{grade.subject_name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{grade.teacher_name || "-"}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{grade.nilai}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant}>{gradeLabel}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada nilai yang ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
