import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { subjectsAPI } from "@/lib/api";

export default function Subjects() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [name, setName] = useState("");

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: subjectsAPI.getAll,
  });

  const addMutation = useMutation({
    mutationFn: subjectsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Mata pelajaran berhasil ditambahkan");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) => subjectsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Mata pelajaran berhasil diperbarui");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: subjectsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Mata pelajaran berhasil dihapus");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleClose = () => {
    setOpen(false);
    setEditingSubject(null);
    setName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data: { name } });
    } else {
      addMutation.mutate({ name });
    }
  };

  const handleEdit = (subject: any) => {
    setEditingSubject(subject);
    setName(subject.name);
    setOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 md:w-8 md:h-8" />
            Data Mata Pelajaran
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Kelola mata pelajaran untuk sistem nilai</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><BookOpen className="w-4 h-4 mr-2" />Tambah Mata Pelajaran</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Mata Pelajaran</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Matematika" required />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClose}>Batal</Button>
                <Button type="submit">{editingSubject ? "Perbarui" : "Simpan"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-3 md:p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs md:text-sm w-12">No</TableHead>
                <TableHead className="text-xs md:text-sm">Nama Mata Pelajaran</TableHead>
                <TableHead className="text-right text-xs md:text-sm">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects && subjects.length > 0 ? (
                subjects.map((subject: any, index: number) => (
                  <TableRow key={subject.id}>
                    <TableCell className="text-xs md:text-sm">{index + 1}</TableCell>
                    <TableCell className="font-medium text-xs md:text-sm">{subject.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 md:gap-2 justify-end">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEdit(subject)}>
                          <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8"
                          onClick={() => { if (confirm("Yakin ingin menghapus?")) deleteMutation.mutate(subject.id); }}>
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Belum ada mata pelajaran</p>
                    <p className="text-sm mt-1">Klik "Tambah Mata Pelajaran" untuk menambahkan.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
