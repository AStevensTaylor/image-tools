declare module "bun:test" {
	interface Matchers<T> {
		toBeInTheDocument(): T;
		toBeVisible(): T;
		toBeEmptyDOMElement(): T;
		toBeDisabled(): T;
		toBeEnabled(): T;
		toBeInvalid(): T;
		toBeValid(): T;
		toBeRequired(): T;
		toHaveAttribute(attr: string, value?: string): T;
		toHaveClass(className: string | string[]): T;
		toHaveFormValues(values: Record<string, unknown>): T;
		toHaveStyle(css: string | Record<string, unknown>): T;
		toHaveTextContent(
			text: string | RegExp,
			options?: { normalizeWhitespace: boolean },
		): T;
		toHaveValue(value: string | number | string[]): T;
		toBePartiallyChecked(): T;
		toHaveDescription(description: string | RegExp): T;
		toHaveDisplayValue(value: string | string[]): T;
	}
	interface AsymmetricMatchers {
		toBeInTheDocument(): boolean;
		toBeVisible(): boolean;
		toBeEmptyDOMElement(): boolean;
		toBeDisabled(): boolean;
		toBeEnabled(): boolean;
		toBeInvalid(): boolean;
		toBeValid(): boolean;
		toBeRequired(): boolean;
		toHaveAttribute(attr: string, value?: string): boolean;
		toHaveClass(className: string | string[]): boolean;
		toHaveFormValues(values: Record<string, unknown>): boolean;
		toHaveStyle(css: string | Record<string, unknown>): boolean;
		toHaveTextContent(
			text: string | RegExp,
			options?: { normalizeWhitespace: boolean },
		): boolean;
		toHaveValue(value: string | number | string[]): boolean;
		toBePartiallyChecked(): boolean;
		toHaveDescription(description: string | RegExp): boolean;
		toHaveDisplayValue(value: string | string[]): boolean;
	}
}
