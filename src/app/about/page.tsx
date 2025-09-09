'use client';

import Layout from '@/components/layout/Layout';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <Layout>
      {/* Hero Section with Fullscreen Video Background */}
      <div className="relative w-full h-screen overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/background.jpg" // optional poster image
        >
          <source src="/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Dark overlay for premium contrast */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight">
            About <span className="text-green-400">AgriVision</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-gray-200">
            Learn how our AI-powered platform helps farmers and gardeners identify plants and diagnose diseases with precision.
          </p>
          <div className="mt-8">
            <Link
              href="/upload"
              className="px-8 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium shadow-lg"
            >
              Try It Now
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">
              About Us
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              How AgriVision Works
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              AgriVision helps farmers and gardeners identify plants and diagnose diseases using advanced machine learning technology.
            </p>
          </div>

          <div className="mt-12">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <span className="text-xl font-bold">1</span>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Upload an Image</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Take a clear photo of your plant, focusing on the leaves, stems, or any areas showing symptoms. Upload it through our simple interface.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <span className="text-xl font-bold">2</span>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Automatic Plant Identification</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Don't know what plant you're looking at? Our AI can identify common plant species from your image, making it easier to get accurate disease diagnosis.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <span className="text-xl font-bold">3</span>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Disease Detection</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Our advanced machine learning models analyze your plant image to detect signs of diseases, nutritional deficiencies, or pest damage.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <span className="text-xl font-bold">4</span>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Get Recommendations</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Receive tailored recommendations for treating identified issues, including organic and conventional solutions.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <span className="text-xl font-bold">5</span>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Contribute to Continuous Learning</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Provide feedback on analysis results to help improve our models over time, making them more accurate for everyone.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Privacy Focused</h3>
                  <p className="mt-2 text-base text-gray-500">
                    AgriVision processes all images directly in your browser using TensorFlow.js. Your plant images are never sent to a server for analysis, ensuring complete privacy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-green-600 font-semibold tracking-wide uppercase">
              Questions
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Frequently Asked Questions
            </p>
          </div>

          <div className="mt-12">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div>
                <dt className="text-lg font-medium text-gray-900">How accurate is the plant identification?</dt>
                <dd className="mt-2 text-base text-gray-500">
                  Our plant identification system can recognize common plant species with good accuracy, but results may vary depending on image quality and plant variety. We show confidence scores with each identification.
                </dd>
              </div>

              <div>
                <dt className="text-lg font-medium text-gray-900">What types of plant diseases can it detect?</dt>
                <dd className="mt-2 text-base text-gray-500">
                  AgriVision can detect common diseases affecting major crops and garden plants, including blights, mildews, rusts, and various nutrient deficiencies. We're continuously expanding our disease detection capabilities.
                </dd>
              </div>

              <div>
                <dt className="text-lg font-medium text-gray-900">Does it work offline?</dt>
                <dd className="mt-2 text-base text-gray-500">
                  Once the models are loaded, AgriVision can work without an internet connection. However, initial loading requires internet access to download the machine learning models.
                </dd>
              </div>

              <div>
                <dt className="text-lg font-medium text-gray-900">How can I get the best results?</dt>
                <dd className="mt-2 text-base text-gray-500">
                  Take clear, well-lit photos that focus on the plant parts showing symptoms. Include both healthy and affected areas for comparison. Avoid shadows and make sure the image is in focus.
                </dd>
              </div>

              <div>
                <dt className="text-lg font-medium text-gray-900">Is AgriVision a replacement for professional diagnosis?</dt>
                <dd className="mt-2 text-base text-gray-500">
                  AgriVision is designed as a helpful tool, but for critical agricultural decisions or severe plant problems, we recommend consulting with a professional agronomist or plant pathologist.
                </dd>
              </div>

              <div>
                <dt className="text-lg font-medium text-gray-900">Is there a mobile app available?</dt>
                <dd className="mt-2 text-base text-gray-500">
                  Currently, AgriVision is a web-based application that works on all modern browsers. We're developing native mobile apps for iOS and Android that will be released soon.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Contact Us
          </h2>
          <p className="mt-4 text-xl text-gray-500">
            Have questions, feedback, or suggestions? We'd love to hear from you.
          </p>
          <p className="mt-2 text-lg text-green-600 font-medium">
            support@agrivision.example.com
          </p>
          <div className="mt-8">
            <Link
              href="/upload"
              className="px-8 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium shadow-lg"
            >
              Start Analyzing Plants
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}