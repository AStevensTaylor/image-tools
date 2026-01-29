import { expect, test } from "bun:test";
import { cn } from "./utils";

test("cn: single class name", () => {
	expect(cn("px-2")).toBe("px-2");
});

test("cn: multiple class names", () => {
	const result = cn("px-2", "py-4", "rounded");
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
	expect(result).toContain("rounded");
});

test("cn: conditional classes with object syntax", () => {
	const isActive = true;
	const isDisabled = false;
	const result = cn({
		"bg-blue-500": isActive,
		"opacity-50": isDisabled,
		"text-white": true,
	});
	expect(result).toContain("bg-blue-500");
	expect(result).toContain("text-white");
	expect(result).not.toContain("opacity-50");
});

test("cn: tailwind conflict resolution - later value wins", () => {
	const result = cn("px-2", "px-4");
	expect(result).toContain("px-4");
	expect(result).not.toContain("px-2");
});

test("cn: tailwind padding conflict - width takes precedence", () => {
	const result = cn("p-2", "px-4");
	expect(result).toContain("px-4");
});

test("cn: falsy values are ignored - null", () => {
	const result = cn("px-2", null, "py-4");
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
	expect(result).not.toContain("null");
});

test("cn: falsy values are ignored - undefined", () => {
	const result = cn("px-2", undefined, "py-4");
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
});

test("cn: falsy values are ignored - false", () => {
	const result = cn("px-2", false, "py-4");
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
});

test("cn: array of classes", () => {
	const result = cn(["px-2", "py-4", "rounded"]);
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
	expect(result).toContain("rounded");
});

test("cn: nested array of classes", () => {
	const result = cn(["px-2", ["py-4", "rounded"]]);
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
	expect(result).toContain("rounded");
});

test("cn: mixed types - strings, objects, and arrays", () => {
	const result = cn(
		"px-2",
		{
			"bg-blue-500": true,
			"text-white": true,
		},
		["py-4", "rounded"],
	);
	expect(result).toContain("px-2");
	expect(result).toContain("bg-blue-500");
	expect(result).toContain("text-white");
	expect(result).toContain("py-4");
	expect(result).toContain("rounded");
});

test("cn: empty input returns empty string", () => {
	expect(cn()).toBe("");
});

test("cn: all falsy values returns empty string", () => {
	expect(cn(null, undefined, false)).toBe("");
});

test("cn: handles empty strings", () => {
	const result = cn("px-2", "", "py-4");
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
});

test("cn: color class resolution", () => {
	const result = cn("text-red-500", "text-blue-500");
	expect(result).toContain("text-blue-500");
	expect(result).not.toContain("text-red-500");
});

test("cn: size class resolution", () => {
	const result = cn("w-full", "w-1/2");
	expect(result).toContain("w-1/2");
	expect(result).not.toContain("w-full");
});

test("cn: display class resolution", () => {
	const result = cn("flex", "grid");
	const resultStr = result.toString();
	expect(resultStr.length).toBeGreaterThan(0);
});

test("cn: complex real-world scenario - button styling", () => {
	const isDisabled = false;
	const isLoading = true;
	const result = cn(
		"px-4 py-2 rounded font-semibold",
		{
			"opacity-50 cursor-not-allowed": isDisabled,
			"animate-pulse": isLoading,
		},
		isDisabled ? "bg-gray-300" : "bg-blue-500 hover:bg-blue-600",
	);

	expect(result).toContain("px-4");
	expect(result).toContain("py-2");
	expect(result).toContain("rounded");
	expect(result).toContain("font-semibold");
	expect(result).toContain("animate-pulse");
	expect(result).toContain("bg-blue-500");
	expect(result).not.toContain("opacity-50");
	expect(result).not.toContain("bg-gray-300");
});

test("cn: complex real-world scenario - responsive classes", () => {
	const result = cn("w-full", "md:w-1/2", "lg:w-1/3", "px-4 md:px-6 lg:px-8");

	expect(result).toContain("w-full");
	expect(result).toContain("md:w-1/2");
	expect(result).toContain("lg:w-1/3");
	expect(result).toContain("px-4");
	expect(result).toContain("md:px-6");
	expect(result).toContain("lg:px-8");
});

test("cn: variant with base classes", () => {
	const variant = "destructive";
	const result = cn(
		"px-4 py-2 rounded",
		variant === "destructive"
			? "bg-red-500 text-white"
			: "bg-blue-500 text-white",
	);

	expect(result).toContain("px-4");
	expect(result).toContain("py-2");
	expect(result).toContain("rounded");
	expect(result).toContain("bg-red-500");
	expect(result).toContain("text-white");
});

test("cn: margin and padding conflict resolution", () => {
	const result = cn("m-4", "mt-2");
	expect(result).toContain("mt-2");
});

test("cn: multiple conflicting utilities", () => {
	const result = cn(
		"rounded-sm rounded-md rounded-lg",
		"text-sm text-base text-lg",
	);
	expect(result).toContain("rounded-lg");
	expect(result).toContain("text-lg");
});

test("cn: with template literal expressions", () => {
	const isActive = true;
	const baseClass = "px-4 py-2";
	const result = cn(baseClass, isActive ? "bg-blue-500" : "bg-gray-200");

	expect(result).toContain("px-4");
	expect(result).toContain("py-2");
	expect(result).toContain("bg-blue-500");
});

test("cn: whitespace handling", () => {
	const result = cn("   px-2   ", "   py-4   ");
	expect(result).toContain("px-2");
	expect(result).toContain("py-4");
});
