import * as React from "react";
import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  ClipboardList,
  Clock3,
  FileText,
  Folder,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: NavItem[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

export type UserData = {
  name: string;
  email: string;
  avatar: string;
};

export type SidebarData = {
  logo: {
    src: string;
    alt: string;
    title: string;
    description: string;
  };
  navGroups: NavGroup[];
  footerGroup: NavGroup;
  user?: UserData;
  workspaces?: Array<{
    id: string;
    name: string;
    logo: string;
    plan: string;
  }>;
  activeWorkspace?: string;
};

export const sidebarData: SidebarData = {
  logo: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblocks-logo.svg",
    alt: "Shadcnblocks",
    title: "OmniSupport",
    description: "SaaS Ticketing System",
  },
  navGroups: [
    {
      title: "Overview",
      defaultOpen: true,
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", isActive: true },
        { label: "Tasks", icon: ClipboardList, href: "#" },
        { label: "Roadmap", icon: BarChart3, href: "#" },
      ],
    },
    {
      title: "Projects",
      defaultOpen: true,
      items: [
        {
          label: "Active Projects",
          icon: Briefcase,
          href: "#",
          children: [
            { label: "Project Alpha", icon: FileText, href: "#" },
            { label: "Project Beta", icon: FileText, href: "#" },
          ],
        },
      ],
    },
    {
      title: "Team",
      defaultOpen: false,
      items: [
        { label: "Members", icon: Users, href: "#" },
        { label: "Sprints", icon: Clock3, href: "#" },
        { label: "Approvals", icon: BadgeCheck, href: "#" },
        { label: "Reviews", icon: Star, href: "#" },
      ],
    },
  ],
  footerGroup: {
    title: "Support",
    items: [
      { label: "Help Center", icon: HelpCircle, href: "#" },
      { label: "Settings", icon: Settings, href: "#" },
    ],
  },
  user: {
    name: "Agente Suporte",
    email: "agente@omnisupport.com",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
  },
};
