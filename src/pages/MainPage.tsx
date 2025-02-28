"use client"

import React from "react"
import VideoEditPage from "./VideoEditPage"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"

const MainPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                <Header />
                <VideoEditPage />
                <Footer />
            </div>
        </div>
    )
}

export default MainPage
