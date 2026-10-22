"use client";

import { TrustBar } from "@/components/sections/TrustBar";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Services } from "@/components/sections/Services";
import { Compliance } from "@/components/sections/Compliance";
import { Fleet } from "@/components/sections/Fleet";
import { Differentials } from "@/components/sections/Differentials";
import { Process } from "@/components/sections/Process";
import { CTA } from "@/components/sections/CTA";
import { ContactForm } from "@/components/sections/ContactForm";
import { CareerForm } from "@/components/sections/CareerForm";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <TrustBar />
      <About />
      <Services />
      <Compliance />
      <Fleet />
      <Differentials />
      <Process />
      <CTA />
      <ContactForm />
      <CareerForm />
      <Footer />
    </main>
  );
}
