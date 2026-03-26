"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/admin/Sidebar"

export default function AdminLayout({
 children
}:{children:React.ReactNode}){

 const router = useRouter()
 const pathname = usePathname()

 const { user, isLoading } = useAuth()

 const isLoginPage = pathname === "/admin/login"

 useEffect(()=>{

  if(!isLoading && !isLoginPage){

   if(!user || (user.role !== "admin" && user.role !== "editor")){
    router.push("/admin/login")
   }

  }

 },[user,isLoading,router,isLoginPage])

 if(isLoading && !isLoginPage){
  return (
   <div className="loading-screen">
    <div className="loading-inner">
     <div className="loading-logo">
      <span className="logo-dot" />
      <span className="logo-dot" />
      <span className="logo-dot" />
     </div>
     <p className="loading-text">Authenticating...</p>
    </div>

    <style>{`
     @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');

     * { box-sizing: border-box; margin: 0; padding: 0; }

     .loading-screen {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0f;
      font-family: 'DM Sans', sans-serif;
      position: relative;
      overflow: hidden;
     }

     .loading-screen::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
       radial-gradient(ellipse 60% 40% at 20% 60%, rgba(99,102,241,0.12) 0%, transparent 70%),
       radial-gradient(ellipse 40% 60% at 80% 30%, rgba(168,85,247,0.08) 0%, transparent 70%);
     }

     .loading-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
      position: relative;
      z-index: 1;
     }

     .loading-logo {
      display: flex;
      align-items: center;
      gap: 10px;
     }

     .logo-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #6366f1;
      animation: pulse-dot 1.4s ease-in-out infinite;
     }

     .logo-dot:nth-child(2) {
      background: #8b5cf6;
      animation-delay: 0.2s;
      width: 16px;
      height: 16px;
     }

     .logo-dot:nth-child(3) {
      background: #a78bfa;
      animation-delay: 0.4s;
     }

     @keyframes pulse-dot {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1.2); opacity: 1; }
     }

     .loading-text {
      color: rgba(255,255,255,0.4);
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      animation: fade-in-up 0.6s ease forwards;
     }

     @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
     }
    `}</style>
   </div>
  )
 }

 if(isLoginPage){
  return <>{children}</>
 }

 if(!user || (user.role !== "admin" && user.role !== "editor")){
  return null
 }

 return(
  <div className="admin-root">

   <Sidebar/>

   <main className="admin-main">
    <div className="admin-content">
     {children}
    </div>
   </main>

   <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Syne:wght@700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
     --bg-base: #0a0a0f;
     --bg-surface: #111118;
     --bg-elevated: #16161f;
     --border: rgba(255,255,255,0.06);
     --border-hover: rgba(255,255,255,0.12);
     --text-primary: rgba(255,255,255,0.92);
     --text-secondary: rgba(255,255,255,0.5);
     --accent: #6366f1;
     --accent-soft: rgba(99,102,241,0.12);
     --accent-glow: rgba(99,102,241,0.25);
     --sidebar-w: 260px;
     --font-sans: 'DM Sans', -apple-system, sans-serif;
    }

    html, body { height: 100%; background: var(--bg-base); }

    .admin-root {
     display: flex;
     min-height: 100vh;
     background: var(--bg-base);
     font-family: var(--font-sans);
     position: relative;
    }

    /* ─── Main Content ─── */
    .admin-main {
     flex: 1;
     margin-left: var(--sidebar-w);
     min-height: 100vh;
     background: var(--bg-base);
     position: relative;
     transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .admin-main::before {
     content: '';
     position: fixed;
     top: 0; right: 0;
     width: 60vw; height: 60vh;
     background: radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.06) 0%, transparent 65%);
     pointer-events: none;
     z-index: 0;
    }

    .admin-content {
     position: relative;
     z-index: 1;
     padding: 2.5rem 2.5rem;
     min-height: 100vh;
     animation: content-in 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    @keyframes content-in {
     from { opacity: 0; transform: translateY(12px); }
     to   { opacity: 1; transform: translateY(0); }
    }

    /* ─── Responsive ─── */
    @media (max-width: 1024px) {
     :root { --sidebar-w: 220px; }
     .admin-content { padding: 2rem; }
    }

    @media (max-width: 768px) {
     .admin-main {
      margin-left: 0;
     }
     .admin-content {
      padding: 1.25rem 1rem;
     }
    }

    @media (max-width: 480px) {
     .admin-content { padding: 1rem 0.75rem; }
    }

    /* ─── Scrollbar ─── */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
     background: rgba(99,102,241,0.3);
     border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.55); }
   `}</style>

  </div>
 )
}