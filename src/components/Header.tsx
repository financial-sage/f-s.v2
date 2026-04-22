"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import type { DashboardMember } from "@/lib/dashboard";

interface HeaderProps {
  familyName: string;
  members: DashboardMember[];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Header({ familyName, members }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
    <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-surface/80 px-6 py-4 backdrop-blur-md">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
          {familyName}
        </p>
        <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">
          SinDescuadre
        </h1>
      </div>

      <div className="flex items-center">
        <button type="button" onClick={() => setIsProfileOpen(true)} className="flex -space-x-3 cursor-pointer">
          {members.slice(0, 2).map((member) => (
            <div
              key={member.id}
              title={member.name}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-surface-lowest bg-primary-container text-xs font-bold text-on-primary-container shadow-sm"
            >
              {member.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{getInitials(member.name)}</span>
              )}
            </div>
          ))}
        </button>

        <button className="ml-4 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container">
          <Bell size={22} strokeWidth={1.6} />
        </button>
      </div>
    </header>
    <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
