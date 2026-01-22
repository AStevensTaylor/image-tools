import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings, type Theme, type ExportFormat } from "@/lib/settings";

export function SettingsDialog() {
  const { settings, setTheme, setExportFormat } = useSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Settings">
          <SettingsIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your appearance and export preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Theme Settings */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Appearance</Label>
            <RadioGroup
              value={settings.theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="font-normal cursor-pointer">
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="font-normal cursor-pointer">
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="font-normal cursor-pointer">
                  System (default)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Format Settings */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <RadioGroup
              value={settings.exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png" className="font-normal cursor-pointer">
                  PNG (lossless, best quality)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webp" id="webp" />
                <Label htmlFor="webp" className="font-normal cursor-pointer">
                  WebP (modern, smaller files)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jpg" id="jpg" />
                <Label htmlFor="jpg" className="font-normal cursor-pointer">
                  JPG (maximum compatibility)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              This format will be used when exporting cropped images and extracted frames.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
