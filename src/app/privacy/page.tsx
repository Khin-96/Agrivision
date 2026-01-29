'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';

export default function PrivacyPage() {
    return (
        <Layout>
            <div className="min-h-screen bg-gray-50">
                {/* Hero Section */}
                <div className="bg-green-700 py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-4xl font-extrabold text-white">Privacy Policy</h1>
                        <p className="mt-4 text-lg text-green-100">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="bg-white shadow-lg rounded-xl p-8 space-y-8">

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    At AgriVision, we collect information to provide better services to our users. The types of information we collect include:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Account Information:</strong> Name, email address, phone number, and farm details when you register</li>
                                    <li><strong>Plant Images:</strong> Photos and videos you upload for disease analysis</li>
                                    <li><strong>Analysis History:</strong> Results from your plant disease scans and AI consultations</li>
                                    <li><strong>Location Data:</strong> Farm location and geolocation data (with your permission)</li>
                                    <li><strong>Usage Data:</strong> How you interact with our platform and features you use</li>
                                    <li><strong>Payment Information:</strong> Transaction details for marketplace purchases (processed securely via M-Pesa)</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>We use the information we collect to:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Provide AI-powered plant disease detection and recommendations</li>
                                    <li>Maintain and improve our machine learning models</li>
                                    <li>Facilitate marketplace transactions between farmers and buyers</li>
                                    <li>Send you important updates about your account and our services</li>
                                    <li>Provide personalized farming insights and weather alerts</li>
                                    <li>Ensure platform security and prevent fraud</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Storage and Security</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    Your data security is our priority. We implement industry-standard security measures:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Encryption:</strong> All data transmitted is encrypted using SSL/TLS protocols</li>
                                    <li><strong>Cloud Storage:</strong> Analysis history is securely stored in our cloud database for logged-in users</li>
                                    <li><strong>Local Storage:</strong> Guest users' data remains on their device only</li>
                                    <li><strong>Access Control:</strong> Strict authentication and authorization protocols</li>
                                    <li><strong>Regular Backups:</strong> Your data is regularly backed up to prevent loss</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Image Processing and AI</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    When you upload plant images for analysis:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Images are processed by our AI models (Google Gemini and Groq)</li>
                                    <li>Images may be temporarily stored for processing but are not shared publicly</li>
                                    <li>Analysis results are saved to your account history (if logged in)</li>
                                    <li>We may use anonymized images to improve our AI models</li>
                                    <li>You can delete your analysis history at any time</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Information Sharing</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>We do not sell your personal information. We may share information with:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Service Providers:</strong> AI providers (Google, Groq) for analysis processing</li>
                                    <li><strong>Payment Processors:</strong> M-Pesa/Safaricom for transaction processing</li>
                                    <li><strong>Other Users:</strong> Only your public marketplace listings (if you're a seller)</li>
                                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights and Choices</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>You have the right to:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Access your personal data and analysis history</li>
                                    <li>Update or correct your account information</li>
                                    <li>Delete your account and associated data</li>
                                    <li>Opt-out of marketing communications</li>
                                    <li>Request a copy of your data</li>
                                    <li>Withdraw consent for data processing</li>
                                </ul>
                                <p className="mt-4">
                                    To exercise these rights, please contact us at{' '}
                                    <a href="mailto:privacy@agrivision.com" className="text-green-600 hover:text-green-700 font-medium">
                                        privacy@agrivision.com
                                    </a>
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    We use cookies and similar technologies to enhance your experience. These help us:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Remember your login session</li>
                                    <li>Store your preferences and settings</li>
                                    <li>Analyze platform usage and performance</li>
                                    <li>Provide personalized content</li>
                                </ul>
                                <p className="mt-4">
                                    You can control cookies through your browser settings.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    AgriVision is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Policy</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>If you have questions about this Privacy Policy, please contact us:</p>
                                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                    <p><strong>Email:</strong> privacy@agrivision.com</p>
                                    <p><strong>Address:</strong> AgriVision, Nairobi, Kenya</p>
                                </div>
                            </div>
                        </section>

                        <div className="pt-8 border-t border-gray-200">
                            <Link
                                href="/"
                                className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
