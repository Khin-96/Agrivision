'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900">About AgriVision</h1>
          <p className="mt-4 text-lg text-gray-500">
            AgriVision helps farmers and gardeners identify plants and diagnose diseases using advanced machine learning technology.
          </p>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">How It Works</h2>
            <div className="mt-6 border-t border-gray-200 pt-6">
              <dl className="space-y-8">
                <div>
                  <dt className="text-lg font-medium text-gray-900">1. Upload an Image</dt>
                  <dd className="mt-2 text-base text-gray-500">
                    Take a clear photo of your plant, focusing on the leaves, stems, or any areas showing symptoms. Upload it through our simple interface.
                  </dd>
                </div>

                <div>
                  <dt className="text-lg font-medium text-gray-900">2. Automatic Plant Identification</dt>
                  <dd className="mt-2 text-base text-gray-500">
                    Don't know what plant you're looking at? Our AI can identify common plant species from your image, making it easier to get accurate disease diagnosis.
                  </dd>
                </div>

                <div>
                  <dt className="text-lg font-medium text-gray-900">3. Disease Detection</dt>
                  <dd className="mt-2 text-base text-gray-500">
                    Our advanced machine learning models analyze your plant image to detect signs of diseases, nutritional deficiencies, or pest damage.
                  </dd>
                </div>

                <div>
                  <dt className="text-lg font-medium text-gray-900">4. Get Recommendations</dt>
                  <dd className="mt-2 text-base text-gray-500">
                    Receive tailored recommendations for treating identified issues, including organic and conventional solutions.
                  </dd>
                </div>

                <div>
                  <dt className="text-lg font-medium text-gray-900">5. Contribute to Continuous Learning</dt>
                  <dd className="mt-2 text-base text-gray-500">
                    Provide feedback on analysis results to help improve our models over time, making them more accurate for everyone.
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Privacy & Security</h2>
            <p className="mt-4 text-base text-gray-500">
              AgriVision processes all images directly in your browser using TensorFlow.js. Your plant images are never sent to a server for analysis, ensuring complete privacy.
            </p>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <div className="mt-6 border-t border-gray-200 pt-6">
              <dl className="space-y-8">
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
              </dl>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
            <p className="mt-4 text-base text-gray-500">
              Have questions, feedback, or suggestions? We'd love to hear from you. Contact our team at support@agrivision.example.com.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
