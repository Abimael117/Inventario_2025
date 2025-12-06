import type { LucideProps } from "lucide-react";

const CustomLogo = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M8.38 4.63A8.53 8.53 0 1 0 19.37 15.6"/>
    <path d="M15.63 19.37A8.53 8.53 0 1 0 4.63 8.4"/>
  </svg>
);


export const Icons = {
  logo: (props: LucideProps) => <CustomLogo {...props} />,
};
