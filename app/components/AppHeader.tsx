"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";import {getSupabase} from "@/lib/supabase-browser";

const NAV=[{href:"/discover",label:"Discover"},{href:"/collection",label:"Collection"},{href:"/compare",label:"Compare"},{href:"/deal-lab",label:"Deal Lab"}];
export function AppHeader(){
 const [user,setUser]=useState<{name:string,email:string}|null>(null);
 useEffect(()=>{const sync=()=>{try{setUser(JSON.parse(localStorage.getItem("fl-user")||"null"))}catch{}};const supabase=getSupabase();if(supabase){supabase.auth.getUser().then(({data})=>{if(data.user){const u={name:data.user.user_metadata?.display_name||data.user.email?.split("@")[0]||"Profile",email:data.user.email||""};localStorage.setItem("fl-user",JSON.stringify(u));setUser(u)}});const {data}=supabase.auth.onAuthStateChange((_e,session)=>{if(session?.user){const u={name:session.user.user_metadata?.display_name||session.user.email?.split("@")[0]||"Profile",email:session.user.email||""};localStorage.setItem("fl-user",JSON.stringify(u));setUser(u)}else{localStorage.removeItem("fl-user");setUser(null)}});return()=>data.subscription.unsubscribe()}sync();window.addEventListener("fl-auth",sync);return()=>window.removeEventListener("fl-auth",sync)},[]);
 return <header className="sticky top-0 z-50 border-b border-ink/[.08] bg-bg/90 backdrop-blur-xl"><nav className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
  <Logo/><div className="hidden items-center gap-7 text-[13px] font-medium text-ink/60 lg:flex">{NAV.map(n=><Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>)}</div>
  <div className="flex items-center gap-2"><Link href="/ask" className="rounded-full border border-ink/15 px-4 py-2.5 text-[12px] font-semibold hover:border-ink/40">Ask FragranceLab ↗</Link>{user?<Link href="/profile" className="profile-pill"><span className="avatar">{(user.name||"U").slice(0,1).toUpperCase()}</span><span className="hidden sm:inline">{user.name||"Profile"}</span></Link>:<Link href="/login" className="rounded-full border border-ink/15 px-4 py-2.5 text-[12px] font-semibold">Log in</Link>}</div>
 </nav><div className="mobile-nav lg:hidden">{NAV.map(n=><Link key={n.href} href={n.href}>{n.label}</Link>)}</div></header>
}
