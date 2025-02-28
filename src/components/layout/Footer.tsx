"use client"

import React from "react"

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-900 text-gray-400 text-sm py-6 mt-10">
            <div className="container mx-auto text-center">
                <p className="mb-2">Made with ❤️ for the open-source community.</p>
                <p className="mb-2">
                    Released under the{" "}
                    <a href="https://opensource.org/licenses/MIT" className="text-blue-400 hover:underline">
                        MIT License
                    </a>.
                </p>
                <p>
                    Contribute on{" "}
                    <a href="https://github.com/AbdulKhadhar/eddit" className="text-blue-400 hover:underline">
                        GitHub
                    </a>{" "}
                    | &copy; {new Date().getFullYear()} Eddit 0.0.1
                </p>
            </div>
        </footer>
    )
}

export default Footer
