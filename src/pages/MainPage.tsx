"use client"

import React from "react"
import * as Tabs from "@radix-ui/react-tabs"
import VideoEditPage from "./VideoEditPage"
import ImageOptimizationPage from "./ImageOptimizationPage"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import { Film, Image as ImageIcon } from "lucide-react"

const MainPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                <Header />
                <Tabs.Root defaultValue="video" className="flex flex-col w-full">
                    <Tabs.List className="flex shrink-0 border-b border-gray-700 mb-6">
                        <Tabs.Trigger
                            value="video"
                            className="flex items-center px-6 py-3 text-lg font-medium text-gray-400 hover:text-gray-200 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 outline-none cursor-pointer transition-colors"
                        >
                            <Film className="w-5 h-5 mr-2" />
                            Video Editing
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="image"
                            className="flex items-center px-6 py-3 text-lg font-medium text-gray-400 hover:text-gray-200 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 outline-none cursor-pointer transition-colors"
                        >
                            <ImageIcon className="w-5 h-5 mr-2" />
                            Image Optimization
                        </Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="video" className="outline-none">
                        <VideoEditPage />
                    </Tabs.Content>
                    <Tabs.Content value="image" className="outline-none">
                        <ImageOptimizationPage />
                    </Tabs.Content>
                </Tabs.Root>
                <Footer />
            </div>
        </div>
    )
}

export default MainPage
