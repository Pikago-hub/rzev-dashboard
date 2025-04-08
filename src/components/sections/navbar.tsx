"use client";

// Imports cleaned up
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useScroll } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
// Removed auth-related imports

const INITIAL_WIDTH = "70rem";
const MAX_WIDTH = "950px";

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const drawerVariants = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: 100,
    transition: { duration: 0.1 },
  },
};

// Removed unused animation variants

export function Navbar() {
  const { scrollY } = useScroll();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const t = useTranslations("navbar");

  // Landing URL for external links
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || "https://rzev.ai";

  // Removed scroll handling for nav items

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setHasScrolled(latest > 10);
    });
    return unsubscribe;
  }, [scrollY]);

  // Removed user profile fetching logic

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const handleOverlayClick = () => setIsDrawerOpen(false);

  // Removed sign out handler

  return (
    <header
      className={cn(
        "sticky z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0",
        hasScrolled ? "top-6" : "top-4 mx-0"
      )}
    >
      <motion.div
        initial={{ width: INITIAL_WIDTH }}
        animate={{ width: hasScrolled ? MAX_WIDTH : INITIAL_WIDTH }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div
          className={cn(
            "mx-auto max-w-7xl rounded-2xl transition-all duration-300  xl:px-0",
            hasScrolled
              ? "px-2 border border-border backdrop-blur-lg bg-background/75"
              : "shadow-none px-7"
          )}
        >
          <div className="flex h-[56px] items-center justify-between p-4">
            <a href={landingUrl} className="flex items-center gap-3">
              <Image
                src="/rzev-logo-black-bgwhite.png"
                alt="Rzev Logo"
                width={28}
                height={28}
                className="size-7 md:size-10"
              />
              <p className="text-lg font-semibold text-primary">
                {t("logoText")}
              </p>
            </a>

            <div className="flex flex-row items-center gap-1 md:gap-3 shrink-0">
              <LanguageSwitcher />
              <div className="flex items-center space-x-3">
                {/* Removed for-business button */}

                <div className="relative hidden md:block">
                  <a
                    href={`${landingUrl}/auth`}
                    className="bg-primary h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white w-fit px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
                  >
                    {t("customersPortal")}
                  </a>
                </div>
              </div>
              <button
                className="md:hidden border border-border size-8 rounded-md cursor-pointer flex items-center justify-center"
                onClick={toggleDrawer}
              >
                {isDrawerOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
              transition={{ duration: 0.2 }}
              onClick={handleOverlayClick}
            />

            <motion.div
              className="fixed inset-x-0 w-[95%] mx-auto bottom-3 bg-background border border-border p-4 rounded-xl shadow-lg"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={drawerVariants}
            >
              {/* Mobile menu content */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <a href={landingUrl} className="flex items-center gap-3">
                    <Image
                      src="/rzev-logo-black-bgwhite.png"
                      alt="Rzev Logo"
                      width={28}
                      height={28}
                      className="size-7 md:size-10"
                    />
                    <p className="text-lg font-semibold text-primary">
                      {t("logoText")}
                    </p>
                  </a>
                  <button
                    onClick={toggleDrawer}
                    className="border border-border rounded-md p-1 cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center mb-2">
                    <LanguageSwitcher />
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <a
                      href={`${landingUrl}/auth`}
                      className="bg-primary h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white w-full px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      {t("customersPortal")}
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
