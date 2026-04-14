import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function Students() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [nis, setNis] = useState("");
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [jenis_kelamin, setJenis_kelamin] = useState("Laki-laki");

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: studentsAPI.getAll,
  });

  const addMutation = useMutation({
    mutationFn: studentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Siswa berhasil ditambahkan");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nis: string; nama: string; kelas: string; jenis_kelamin: string } }) => studentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Siswa berhasil diperbarui");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: studentsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Siswa berhasil dihapus");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleClose = () => {
    setOpen(false);
    setEditingStudent(null);
    setNis("");
    setNama("");
    setKelas("");
    setJenis_kelamin("Laki-laki");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim() || !nama.trim() || !kelas.trim()) { 
      toast.error("Semua field wajib diisi"); 
      return; 
    }
    // Convert display value to enum value (L or P)
    const jenis_kelamin_enum = jenis_kelamin === "Laki-laki" ? "L" : "P";
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: { nis, nama, kelas, jenis_kelamin: jenis_kelamin_enum } });
    } else {
      addMutation.mutate({ nis, nama, kelas, jenis_kelamin: jenis_kelamin_enum });
    }
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setNis(student.nis);
    setNama(student.nama);
    setKelas(student.kelas);
    // Convert enum value (L/P) to display value
    setJenis_kelamin(student.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan");
    setOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Users className="h-6 w-6 md:h-8 md:w-8" />
            Data Siswa
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">Kelola data siswa dalam sistem</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStudent(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Siswa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
              <DialogDescription>
                {editingStudent ? "Perbarui data siswa" : "Masukkan data siswa baru"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nis">NIS</Label>
                <Input
                  id="nis"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Masukkan NIS siswa"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nama">Nama Siswa</Label>
                <Input
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama siswa"
                  required
                />
              </div>
              <div>
                <Label htmlFor="kelas">Kelas</Label>
                <Input
                  id="kelas"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Masukkan kelas (misal: X-A)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                <select
                  id="jenis_kelamin"
                  value={jenis_kelamin}
                  onChange={(e) => setJenis_kelamin(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>Batal</Button>
                <Button type="submit">{editingStudent ? "Perbarui" : "Tambah"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Daftar Siswa</CardTitle>
          <CardDescription className="text-xs md:text-sm">Total {students?.length || 0} siswa terdaftar</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : students && students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm w-12">No</TableHead>
                  <TableHead className="text-xs md:text-sm">NIS</TableHead>
                  <TableHead className="text-xs md:text-sm">Nama Siswa</TableHead>
                  <TableHead className="text-xs md:text-sm">Kelas</TableHead>
                  <TableHead className="text-xs md:text-sm">Jenis Kelamin</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any, index: number) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-xs md:text-sm">{index + 1}</TableCell>
                    <TableCell className="text-xs md:text-sm">{student.nis}</TableCell>
                    <TableCell className="font-medium text-xs md:text-sm">{student.nama}</TableCell>
                    <TableCell className="text-xs md:text-sm">{student.kelas}</TableCell>
                    <TableCell className="text-xs md:text-sm">{student.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 md:gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleEdit(student)}>
                          <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8"
                          onClick={() => { if (confirm("Yakin ingin menghapus siswa ini?")) deleteMutation.mutate(student.id); }}>
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
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Belum ada data siswa</p>
              <p className="text-sm mt-1">Klik "Tambah Siswa" untuk menambahkan siswa baru.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
