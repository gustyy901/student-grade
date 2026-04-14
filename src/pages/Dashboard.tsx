import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, TrendingUp, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const WEIGHTS = {
  tugas: 0.25,
  uts: 0.35,
  uas: 0.40,
};

export default function Dashboard() {
  const { data: students } = useQuery({ queryKey: ["students"], queryFn: studentsAPI.getAll });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectsAPI.getAll });
  const { data: gradesTugas } = useQuery({ queryKey: ["grades", "tugas"], queryFn: gradesAPI.getAllTugas });
  const { data: gradesUts } = useQuery({ queryKey: ["grades", "uts"], queryFn: gradesAPI.getAllUts });
  const { data: gradesUas } = useQuery({ queryKey: ["grades", "uas"], queryFn: gradesAPI.getAllUas });

  const allGrades = useMemo(() => {
    return [...(gradesTugas || []), ...(gradesUts || []), ...(gradesUas || [])];
  }, [gradesTugas, gradesUts, gradesUas]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!students) return { totalStudents: 0, totalSubjects: 0, totalGrades: 0, avgScore: 0 };
    
    const studentWeightedScores = (students || []).map((student: any) => {
      const tugasList = (gradesTugas || []).filter((g: any) => g.student_id === student.id)
        .map((g: any) => Number(g.nilai || 0));
      const tugasAvg = tugasList.length > 0 ? tugasList.reduce((a, b) => a + b) / tugasList.length : 0;

      const utsList = (gradesUts || []).filter((g: any) => g.student_id === student.id)
        .map((g: any) => Number(g.nilai || 0));
      const utsAvg = utsList.length > 0 ? utsList.reduce((a, b) => a + b) / utsList.length : 0;

      const uasList = (gradesUas || []).filter((g: any) => g.student_id === student.id)
        .map((g: any) => Number(g.nilai || 0));
      const uasAvg = uasList.length > 0 ? uasList.reduce((a, b) => a + b) / utsList.length : 0;

      if (tugasAvg > 0 || utsAvg > 0 || uasAvg > 0) {
        return (tugasAvg * WEIGHTS.tugas) + (utsAvg * WEIGHTS.uts) + (uasAvg * WEIGHTS.uas);
      }
      return 0;
    });

    const validScores = studentWeightedScores.filter(s => s > 0);
    const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b) / validScores.length : 0;

    return {
      totalStudents: students.length,
      totalSubjects: subjects?.length || 0,
      totalGrades: allGrades.length,
      avgScore: avgScore.toFixed(1),
    };
  }, [students, subjects, gradesTugas, gradesUts, gradesUas, allGrades]);

  const gradeDistribution = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    allGrades.forEach((g: any) => {
      const s = Number(g.nilai || 0);
      if (s >= 90) dist.A++;
      else if (s >= 80) dist.B++;
      else if (s >= 70) dist.C++;
      else if (s >= 60) dist.D++;
      else if (s > 0) dist.E++;
    });
    return [
      { grade: "A (90-100)", count: dist.A },
      { grade: "B (80-89)", count: dist.B },
      { grade: "C (70-79)", count: dist.C },
      { grade: "D (60-69)", count: dist.D },
      { grade: "E (<60)", count: dist.E },
    ];
  }, [allGrades]);

  const statCards = [
    {
      title: "Total Siswa",
      value: stats.totalStudents,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/10",
    },
    {
      title: "Mata Pelajaran",
      value: stats.totalSubjects,
      icon: BookOpen,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/10",
    },
    {
      title: "Total Nilai",
      value: stats.totalGrades,
      icon: ClipboardList,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/10 to-orange-500/10",
    },
    {
      title: "Rata-rata Nilai",
      value: stats.avgScore,
      icon: TrendingUp,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
    },
  ];

  const colors = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#ef4444"];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Award className="h-6 w-6 text-white" />
          </div>
          <h2 className="page-title">Dashboard</h2>
        </div>
        <p className="page-description">Ringkasan data dan analisis nilai siswa (Bobot: Tugas 25% | UTS 35% | UAS 40%)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-2xl bg-card p-5 md:p-6 shadow-card border border-border/50 transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</p>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
          </div>
        ))}
      </div>

      <Card className="border-0 shadow-card hover:shadow-xl transition-all duration-500">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl font-bold">Distribusi Nilai</CardTitle>
              <CardDescription className="text-sm">Jumlah nilai berdasarkan grade</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {gradeDistribution.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistribution} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(value) => [`${value} nilai`, "Jumlah"]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="count" name="Jumlah" radius={[12, 12, 0, 0]}>
                  {gradeDistribution.map((_, index) => (
                    <Cell key={index} fill={colors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Award className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Belum ada data nilai</p>
              <p className="text-sm mt-1">Tambahkan nilai untuk melihat distribusi.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
