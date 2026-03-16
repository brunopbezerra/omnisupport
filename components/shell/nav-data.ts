import {
  CheckmarkBadge01Icon,
  BarChartIcon,
  Briefcase01Icon,
  ClipboardIcon,
  Clock01Icon,
  LegalDocumentIcon,
  Folder01Icon,
  GlobeIcon,
  HelpCircleIcon,
  DashboardSquare01Icon,
  Settings01Icon,
  MagicWand01Icon,
  FavouriteIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"

export type NavItem = {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
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
        { label: "Dashboard", icon: DashboardSquare01Icon, href: "/dashboard", isActive: true },
        { label: "Tasks", icon: ClipboardIcon, href: "#" },
        { label: "Roadmap", icon: BarChartIcon, href: "#" },
      ],
    },
    {
      title: "Projects",
      defaultOpen: true,
      items: [
        {
          label: "Active Projects",
          icon: Briefcase01Icon,
          href: "#",
          children: [
            { label: "Project Alpha", icon: LegalDocumentIcon, href: "#" },
            { label: "Project Beta", icon: LegalDocumentIcon, href: "#" },
          ],
        },
      ],
    },
    {
      title: "Team",
      defaultOpen: false,
      items: [
        { label: "Members", icon: UserGroupIcon, href: "#" },
        { label: "Sprints", icon: Clock01Icon, href: "#" },
        { label: "Approvals", icon: CheckmarkBadge01Icon, href: "#" },
        { label: "Reviews", icon: FavouriteIcon, href: "#" },
      ],
    },
  ],
  footerGroup: {
    title: "Support",
    items: [
      { label: "Help Center", icon: HelpCircleIcon, href: "#" },
      { label: "Settings", icon: Settings01Icon, href: "#" },
    ],
  },
  user: {
    name: "Agente Suporte",
    email: "agente@omnisupport.com",
    avatar: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
  },
};
