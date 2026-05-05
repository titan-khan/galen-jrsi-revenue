import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Database, FileSpreadsheet, AlertTriangle } from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  connectsTo: string;
  type: "database" | "file";
  hasWarning?: boolean;
}

const dataSources: DataSource[] = [
  { id: "1", name: "Superstore Datasource", connectsTo: "Sample - Superstore.xls", type: "file" },
  { id: "2", name: "Immigration Data - India", connectsTo: "My Tableau Pulse Data.csv", type: "file", hasWarning: true },
  { id: "3", name: "Air Quality Index", connectsTo: "Air Quality Index.csv", type: "file" },
  { id: "4", name: "Emp Master+ (Sales Data)", connectsTo: "Sales Data.xlsx", type: "file" },
  { id: "5", name: "IMDb Movies India", connectsTo: "IMDb Movies India.csv", type: "file" },
  { id: "6", name: "Production Database", connectsTo: "PostgreSQL - prod.db", type: "database" },
];

interface DataSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (source: DataSource) => void;
}

const DataSourceModal = ({ open, onOpenChange, onConnect }: DataSourceModalProps) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filteredSources = dataSources.filter(
    (source) =>
      source.name.toLowerCase().includes(search.toLowerCase()) ||
      source.connectsTo.toLowerCase().includes(search.toLowerCase())
  );

  const handleConnect = () => {
    const source = dataSources.find((s) => s.id === selected);
    if (source) {
      onConnect(source);
      onOpenChange(false);
      setSelected(null);
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select Data Source</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search data sources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-8"></th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground w-8"></th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Connects To</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((source) => (
                  <tr
                    key={source.id}
                    onClick={() => setSelected(source.id)}
                    className={`cursor-pointer border-t transition-colors ${
                      selected === source.id
                        ? "bg-primary/10"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="py-3 px-4">
                      {source.hasWarning && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {source.type === "database" ? (
                        <Database className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">{source.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{source.connectsTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={!selected}>
              Connect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataSourceModal;
