
import { createContext, useCallback, useMemo, useState, ReactNode, useEffect } from 'react';
import config from './config'
import React from "react";

// Define the shape of the context state
interface CustomizerContextState {
    activeDir: string;
    setActiveDir: (dir: string) => void;
    activeMode: string;
    setActiveMode: (mode: string) => void;
    activeTheme: string;
    setActiveTheme: (theme: string) => void;
    activeLayout: string;
    setActiveLayout: (layout: string) => void;
    isCardShadow: boolean;
    setIsCardShadow: (shadow: boolean) => void;
    isLayout: string;
    setIsLayout: (layout: string) => void;
    isBorderRadius: number;
    setIsBorderRadius: (radius: number) => void;
    isCollapse: string;
    setIsCollapse: (collapse: string) => void;
    isLanguage: string;
    setIsLanguage: (lang: string) => void;
}

// Volatile mobile-sidebar state split into its own context so toggling
// the hamburger menu does not re-render every component that reads
// activeMode / isBorderRadius / isCollapse.
interface MobileSidebarState {
    isMobileSidebar: boolean;
    setIsMobileSidebar: (v: boolean) => void;
}
export const MobileSidebarContext = createContext<MobileSidebarState>({
    isMobileSidebar: false,
    setIsMobileSidebar: () => {},
});

// Create the context with an initial value
export const CustomizerContext = createContext<CustomizerContextState>({
    activeDir: config.activeDir,
    setActiveDir: () => {},
    activeMode: config.activeMode,
    setActiveMode: () => {},
    activeTheme: config.activeTheme,
    setActiveTheme: () => {},
    activeLayout: config.activeLayout,
    setActiveLayout: () => {},
    isCardShadow: config.isCardShadow,
    setIsCardShadow: () => {},
    isLayout: config.isLayout,
    setIsLayout: () => {},
    isBorderRadius: config.isBorderRadius,
    setIsBorderRadius: () => {},
    isCollapse: config.isCollapse,
    setIsCollapse: () => {},
    isLanguage: config.isLanguage,
    setIsLanguage: () => {},
});

// Define the type for the children prop
interface CustomizerContextProps {
    children: ReactNode;
}
// Create the provider component
export const CustomizerContextProvider: React.FC<CustomizerContextProps> = ({ children }) => {

    const [activeDir, setActiveDir] = useState<string>(config.activeDir);
    const [activeMode, setActiveMode] = useState<string>(config.activeMode);
    const [activeTheme, setActiveTheme] = useState<string>(config.activeTheme);
    const [activeLayout, setActiveLayout] = useState<string>(config.activeLayout);
    const [isCardShadow, setIsCardShadow] = useState<boolean>(config.isCardShadow);
    const [isLayout, setIsLayout] = useState<string>(config.isLayout);
    const [isBorderRadius, setIsBorderRadius] = useState<number>(config.isBorderRadius);
    const [isCollapse, setIsCollapse] = useState<string>(config.isCollapse);
    const [isLanguage, setIsLanguage] = useState<string>(config.isLanguage);
    const [isMobileSidebar, setIsMobileSidebar] = useState<boolean>(false);
    // Set attributes immediately
    useEffect(() => {
        document.documentElement.setAttribute("class", activeMode);
        document.documentElement.setAttribute("dir", activeDir);
        document.documentElement.setAttribute('data-color-theme', activeTheme);
        document.documentElement.setAttribute("data-layout", activeLayout);
        document.documentElement.setAttribute("data-boxed-layout", isLayout);
        document.documentElement.setAttribute("data-sidebar-type", isCollapse);

    }, [activeMode, activeDir, activeTheme, activeLayout, isLayout, isCollapse]);

    const setActiveDirCb = useCallback((dir: string) => setActiveDir(dir), []);
    const setActiveModeCb = useCallback((mode: string) => setActiveMode(mode), []);
    const setActiveThemeCb = useCallback((theme: string) => setActiveTheme(theme), []);
    const setActiveLayoutCb = useCallback((layout: string) => setActiveLayout(layout), []);
    const setIsCardShadowCb = useCallback((shadow: boolean) => setIsCardShadow(shadow), []);
    const setIsLayoutCb = useCallback((layout: string) => setIsLayout(layout), []);
    const setIsBorderRadiusCb = useCallback((radius: number) => setIsBorderRadius(radius), []);
    const setIsCollapseCb = useCallback((collapse: string) => setIsCollapse(collapse), []);
    const setIsLanguageCb = useCallback((lang: string) => setIsLanguage(lang), []);
    const setIsMobileSidebarCb = useCallback((v: boolean) => setIsMobileSidebar(v), []);

    // Stable value — only changes when its dependencies change (not on
    // every render).  Prevents cascading re-renders when the provider
    // itself re-renders for reasons unrelated to these values.
    const value = useMemo<CustomizerContextState>(() => ({
        activeDir, setActiveDir: setActiveDirCb,
        activeMode, setActiveMode: setActiveModeCb,
        activeTheme, setActiveTheme: setActiveThemeCb,
        activeLayout, setActiveLayout: setActiveLayoutCb,
        isCardShadow, setIsCardShadow: setIsCardShadowCb,
        isLayout, setIsLayout: setIsLayoutCb,
        isBorderRadius, setIsBorderRadius: setIsBorderRadiusCb,
        isCollapse, setIsCollapse: setIsCollapseCb,
        isLanguage, setIsLanguage: setIsLanguageCb,
    }), [
        activeDir, activeMode, activeTheme, activeLayout,
        isCardShadow, isLayout, isBorderRadius, isCollapse,
        isLanguage,
        setActiveDirCb, setActiveModeCb, setActiveThemeCb, setActiveLayoutCb,
        setIsCardShadowCb, setIsLayoutCb, setIsBorderRadiusCb, setIsCollapseCb,
        setIsLanguageCb,
    ]);

    const mobileValue = useMemo<MobileSidebarState>(() => ({
        isMobileSidebar,
        setIsMobileSidebar: setIsMobileSidebarCb,
    }), [isMobileSidebar, setIsMobileSidebarCb]);

    return (
        <CustomizerContext.Provider value={value}>
        <MobileSidebarContext.Provider value={mobileValue}>
            {children}
        </MobileSidebarContext.Provider>
        </CustomizerContext.Provider>
    );
};

