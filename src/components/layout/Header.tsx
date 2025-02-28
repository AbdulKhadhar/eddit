"use client"

import React from "react"

const Header: React.FC = () => {
    return (
        <header className="mb-8 flex items-center space-x-4">
            <img src="/app-icon.png" alt="Eddit Icon" className="w-12 h-12" />
            <div>
                <h1 className="text-4xl font-bold text-blue-400 mb-1">eddit</h1>
                <p className="text-gray-400 text-lg">For your easy edits</p>
            </div>
        </header>
    )
}

export default Header
