'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <Layout>
            <div className="min-h-screen bg-gray-50">
                {/* Hero Section */}
                <div className="bg-green-700 py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-4xl font-extrabold text-white">Terms of Service</h1>
                        <p className="mt-4 text-lg text-green-100">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="bg-white shadow-lg rounded-xl p-8 space-y-8">

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    By accessing and using AgriVision ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                                </p>
                                <p>
                                    These terms apply to all users, including farmers, buyers, and visitors.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>AgriVision provides:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>AI-powered plant disease detection and identification</li>
                                    <li>Agricultural recommendations and farming insights</li>
                                    <li>Marketplace for buying and selling agricultural products</li>
                                    <li>Farm monitoring and management tools</li>
                                    <li>Weather alerts and personalized farming advice</li>
                                    <li>Analysis history and cloud synchronization</li>
                                </ul>
                                <p className="mt-4">
                                    <strong>Important:</strong> Our AI analysis is for informational purposes only and should not replace professional agricultural advice. For critical decisions, consult with certified agronomists or plant pathologists.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
                            <div className="space-y-4 text-gray-700">
                                <p><strong>Registration:</strong></p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>You must be at least 18 years old to create an account</li>
                                    <li>You must provide accurate and complete information</li>
                                    <li>You are responsible for maintaining account security</li>
                                    <li>You must not share your account credentials</li>
                                    <li>You are responsible for all activities under your account</li>
                                </ul>
                                <p className="mt-4"><strong>Farmer Verification:</strong></p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Farmers must verify their identity to list products</li>
                                    <li>ID verification is required for marketplace access</li>
                                    <li>False information may result in account suspension</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Marketplace Terms</h2>
                            <div className="space-y-4 text-gray-700">
                                <p><strong>For Sellers (Farmers):</strong></p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>You must accurately describe your products</li>
                                    <li>You are responsible for product quality and delivery</li>
                                    <li>You must comply with all applicable agricultural regulations</li>
                                    <li>You must honor confirmed orders</li>
                                    <li>Pricing must be fair and transparent</li>
                                </ul>
                                <p className="mt-4"><strong>For Buyers:</strong></p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>You agree to pay for products you order</li>
                                    <li>Payment is processed through M-Pesa</li>
                                    <li>You must inspect products upon delivery</li>
                                    <li>Disputes should be reported within 24 hours</li>
                                </ul>
                                <p className="mt-4"><strong>Platform Role:</strong></p>
                                <p>
                                    AgriVision acts as a facilitator between buyers and sellers. We are not responsible for the quality, safety, or legality of products listed, the accuracy of listings, or the ability of sellers to complete transactions.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. AI Analysis Disclaimer</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    Our AI-powered plant disease detection is provided "as is" without warranties:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Analysis results may not be 100% accurate</li>
                                    <li>Results depend on image quality and plant conditions</li>
                                    <li>We do not guarantee specific outcomes from following recommendations</li>
                                    <li>The AI is continuously learning and improving</li>
                                    <li>Critical agricultural decisions should involve professional consultation</li>
                                </ul>
                                <p className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                    <strong>⚠️ Important:</strong> AgriVision is not liable for crop losses, reduced yields, or other damages resulting from reliance on AI analysis or recommendations.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Prohibited Activities</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>You agree NOT to:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Upload false, misleading, or fraudulent content</li>
                                    <li>Violate any laws or regulations</li>
                                    <li>Infringe on intellectual property rights</li>
                                    <li>Harass, abuse, or harm other users</li>
                                    <li>Attempt to hack, disrupt, or compromise the platform</li>
                                    <li>Use automated systems to scrape or collect data</li>
                                    <li>Sell prohibited or illegal products</li>
                                    <li>Create multiple accounts to manipulate the system</li>
                                    <li>Reverse engineer our AI models or algorithms</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
                            <div className="space-y-4 text-gray-700">
                                <p><strong>Platform Content:</strong></p>
                                <p>
                                    All content on AgriVision, including text, graphics, logos, software, and AI models, is owned by AgriVision and protected by copyright and intellectual property laws.
                                </p>
                                <p className="mt-4"><strong>User Content:</strong></p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>You retain ownership of images and content you upload</li>
                                    <li>You grant us a license to use your content for platform operations and AI improvement</li>
                                    <li>We may use anonymized data to train and improve our models</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Payment and Fees</h2>
                            <div className="space-y-4 text-gray-700">
                                <p><strong>Platform Access:</strong></p>
                                <p>
                                    Basic features of AgriVision are currently free. We reserve the right to introduce premium features or subscription plans in the future.
                                </p>
                                <p className="mt-4"><strong>Marketplace Transactions:</strong></p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Payments are processed through M-Pesa</li>
                                    <li>We may charge a small transaction fee (to be announced)</li>
                                    <li>All prices are in Kenyan Shillings (KSh)</li>
                                    <li>Refunds are subject to our refund policy</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    To the maximum extent permitted by law, AgriVision shall not be liable for:
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>Indirect, incidental, or consequential damages</li>
                                    <li>Loss of profits, data, or business opportunities</li>
                                    <li>Crop failures or agricultural losses</li>
                                    <li>Errors or inaccuracies in AI analysis</li>
                                    <li>Actions or omissions of other users</li>
                                    <li>Service interruptions or technical issues</li>
                                </ul>
                                <p className="mt-4">
                                    Our total liability shall not exceed the amount you paid us in the past 12 months (if any).
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>We may suspend or terminate your account if:</p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li>You violate these Terms of Service</li>
                                    <li>You engage in fraudulent activity</li>
                                    <li>Your account poses a security risk</li>
                                    <li>Required by law</li>
                                </ul>
                                <p className="mt-4">
                                    You may delete your account at any time through your profile settings.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification. Continued use of the platform after changes constitutes acceptance of the new terms.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>
                                    These Terms of Service are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi, Kenya.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Information</h2>
                            <div className="space-y-4 text-gray-700">
                                <p>For questions about these Terms of Service, contact us:</p>
                                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                                    <p><strong>Email:</strong> legal@agrivision.com</p>
                                    <p><strong>Support:</strong> support@agrivision.com</p>
                                    <p><strong>Address:</strong> AgriVision, Nairobi, Kenya</p>
                                </div>
                            </div>
                        </section>

                        <div className="pt-8 border-t border-gray-200 flex justify-between items-center">
                            <Link
                                href="/"
                                className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
                            >
                                ← Back to Home
                            </Link>
                            <Link
                                href="/privacy"
                                className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
                            >
                                Privacy Policy →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
