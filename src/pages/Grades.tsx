import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsAPI, subjectsAPI, gradesAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ClipboardList, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Grades() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [formData, setFormData] = useState({ student_id: "", subject_id: "", score: "" });

  const { data: students } = useQuery({ queryKey: ["students"], queryFn: studentsAPI.getAll });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: subjectsAPI.getAll });
  const { data: grades, isLoading } = useQuery({ queryKey: ["grades"], queryFn: gradesAPI.getAll });

  const addMutation = useMutation({
    mutationFn: gradesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Nilai berhasil ditambahkan");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => gradesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Nilai berhasil diperbarui");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: gradesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Nilai berhasil dihapus");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleClose = () => {
    setOpen(false);
    setEditingGrade(null);
    setFormData({ student_id: "", subject_id: "", score: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) { toast.error("Pilih siswa"); return; }
    if (!formData.subject_id) { toast.error("Pilih mata pelajaran"); return; }
    if (!formData.score) { toast.error("Masukkan nilai"); return; }

    const data = {
      student_id: Number(formData.student_id),
      subject_id: Number(formData.subject_id),
      score: Number(formData.score),
    };

    if (editingGrade) {
      updateMutation.mutate({ id: editingGrade.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEdit = (grade: any) => {
    setEditingGrade(grade);
    setFormData({
      student_id: String(grade.student_id),
      subject_id: String(grade.subject_id),
      score: String(grade.score),
    });
    setOpen(true);
  };

  const hasStudents = students && students.length > 0;
  const hasSubjects = subjects && subjects.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 md:h-8 md:w-8" />
            Input Nilai
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">Kelola nilai siswa per mata pelajaran</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!hasStudents || !hasSubjects} onClick={() => setEditingGrade(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Nilai
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGrade ? "Edit Nilai" : "Tambah Nilai"}</DialogTitle>
              <DialogDescription>{editingGrade ? "Perbarui nilai siswa" : "Masukkan nilai siswa baru"}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Siswa</Label>
                <Select value={formData.student_id} onValueChange={(v) => setFormData({ ...formData, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                  <SelectContent>
                    {students?.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mata Pelajaran</Label>
                <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nilai (0-100)</Label>
                <Input type="number" min="0" max="100" value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>Batal</Button>
                <Button type="submit">{editingGrade ? "Perbarui" : "Tambah"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!hasStudents && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data siswa. <a href="/students" className="font-semibold underline">Tambahkan siswa</a> terlebih dahulu.
          </AlertDescription>
        </Alert>
      )}
      {!hasSubjects && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada mata pelajaran. <a href="/subjects" className="font-semibold underline">Tambahkan mata pelajaran</a> terlebih dahulu.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Daftar Nilai</CardTitle>
          <CardDescription className="text-xs md:text-sm">Total {grades?.length || 0} nilai</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : grades && grades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm w-12">No</TableHead>
                  <TableHead className="text-xs md:text-sm">Siswa</TableHead>
                  <TableHead className="text-xs md:text-sm hidden sm:table-cell">Mata Pelajaran</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Nilai</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade: any, index: number) => (
                  <TableRow key={grade.id}>
                    <TableCell className="text-xs md:text-sm">{index + 1}</TableCell>
                    <TableCell className="font-medium text-xs md:text-sm">{grade.student_name}</TableCell>
                    <TableCell className="text-xs md:text-sm hidden sm:table-cell">{grade.subject_name}</TableCell>
                    <TableCell className="text-right font-semibold text-xs md:text-sm">{grade.score}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 md:gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleEdit(grade)}>
                          <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8"
                          onClick={() => { if (confirm("Hapus nilai ini?")) deleteMutation.mutate(grade.id); }}>
                          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Belum ada data nilai</p>
              <p className="text-sm mt-1">Klik "Tambah Nilai" untuk menambahkan nilai baru.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
