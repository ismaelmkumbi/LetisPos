import { useBrandCss } from 'src/branding/hooks/useBrandCss';

/**
 * ThemeInjector is a non-visual component that injects brand tokens
 * as CSS custom properties on the :root element.
 *
 * Place this component inside the BrandProvider tree (typically in App.tsx)
 * so that brand CSS variables are available globally.
 *
 * This component renders nothing - its sole purpose is the side effect
 * of calling useBrandCss() which updates document.documentElement.style.
 */
export default function ThemeInjector() {
  useBrandCss();
  return null;
}