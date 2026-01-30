import { Settings as SettingsIcon } from "lucide-react";
import { useCallback } from "react";
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
import { type ExportFormat, type Theme, useSettings } from "@/lib/settings";

/**
 * SettingsDialog component provides a modal interface for user preferences.
 * Allows customization of appearance theme and image export format/quality.
 * @returns The rendered settings dialog component
 */

/**
 * Type guard to validate if a string is a valid Theme value.
 * @param value - The value to check
 * @returns True if value is a valid Theme type
 */
function isTheme(value: string): value is Theme {
	return ["light", "dark", "system"].includes(value);
}

/**
 * Type guard to validate if a string is a valid ExportFormat value.
 * @param value - The value to check
 * @returns True if value is a valid ExportFormat type
 */
function isExportFormat(value: string): value is ExportFormat {
	return ["png", "webp", "jpg"].includes(value);
}

export function SettingsDialog() {
	const { settings, setTheme, setExportFormat } = useSettings();

	const onThemeChange = useCallback(
		(value: string) => {
			if (isTheme(value)) {
				setTheme(value);
			}
		},
		[setTheme],
	);

	const onExportFormatChange = useCallback(
		(value: string) => {
			if (isExportFormat(value)) {
				setExportFormat(value);
			}
		},
		[setExportFormat],
	);

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
						<RadioGroup value={settings.theme} onValueChange={onThemeChange}>
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
							onValueChange={onExportFormatChange}
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
							This format will be used when exporting cropped images and
							extracted frames.
						</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
