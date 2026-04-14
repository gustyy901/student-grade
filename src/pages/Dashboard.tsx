import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, TrendingUp, Award, Target } from "lucide-react";
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
      const uasAvg = uasList.length > 0 ? uasList.reduce((a, b) => a + b) / uasList.length : 0;

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
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen">
      <div className="page-header mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl">
            <Target className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="page-title text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Dashboard</h2>
            <p className="page-description text-base mt-2 text-gray-600 dark:text-gray-300">Ringkasan lengkap data siswa, mata pelajaran, dan analisis nilai dengan weighted average (Tugas 25% 📝 | UTS 35% 📋 | UAS 40% 📄)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {statCards.map((stat, index) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 p-6 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-slate-800 transition-all duration-500 hover:-translate-y-1"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-gradient-to-br ${stat.bgGradient} rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.title}</span>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-xl`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className={`text-4xl md:text-5xl font-black bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-3xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="pb-6 border-b border-gray-200 dark:border-slate-800 relative z-10">
          <div className="flex items-start gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 dark:from-cyan-900/40 dark:to-blue-900/40">
              <Target className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Distribusi Nilai Siswa</CardTitle>
              <CardDescription className="text-base mt-2 text-gray-600 dark:text-gray-300">Visualisasi jumlah nilai berdasarkan grade (A-E) dengan skala penilaian standar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8 relative z-10">
          {gradeDistribution.some(d => d.count > 0) ? (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={gradeDistribution} margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="grade" tick={{ fontSize: 13, fill: 'hsl(var(--foreground))', fontWeight: 500 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(value) => [`${value} siswa`, "Total"]}
                    labelFormatter={(label) => `Grade: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--border))',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    }}
                    cursor={{ fill: 'rgba(100, 200, 255, 0.1)' }}
                  />
                  <Bar dataKey="count" name="Jumlah" radius={[16, 16, 0, 0]} animationDuration={800}>
                    {gradeDistribution.map((_, index) => (
                      <Cell key={index} fill={colors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-2 mt-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50">
                {gradeDistribution.map((item, idx) => (
                  <div key={idx} className="text-center p-3 rounded-xl bg-white dark:bg-slate-700/50">
                    <p className="font-bold text-lg" style={{ color: colors[idx] }}>{item.grade.charAt(0)}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{item.count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">siswa</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Target className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-xl font-semibold text-gray-600 dark:text-gray-300">Belum ada data nilai</p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-2">Mulai tambahkan nilai siswa untuk melihat distribusi grade di sini</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
