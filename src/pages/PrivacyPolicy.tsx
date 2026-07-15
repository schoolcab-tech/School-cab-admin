const PrivacyPolicy = () => {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            {/* <Button 
              variant="outline" 
              onClick={handleGoBack}
              className="mb-4 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button> */}
            <div className="bg-white rounded-lg shadow-lg border-l-4 border-yellow-400 p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Privacy Policy
              </h1>
              <p className="text-yellow-600 mb-6">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    1. Information We Collect
                  </h2>
                  <p className="mb-3">
                    We collect information you provide directly to us, such as:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>
                      Personal information (name, email address, phone number)
                    </li>
                    <li>Student information for transportation services</li>
                    <li>Location data for route optimization</li>
                    <li>Payment information for billing purposes</li>
                    <li>Communication preferences and feedback</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    2. How We Use Your Information
                  </h2>
                  <p className="mb-3">We use the information we collect to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>
                      Provide and maintain our school transportation services
                    </li>
                    <li>Process payments and manage billing</li>
                    <li>Send you service updates and notifications</li>
                    <li>Improve our services and user experience</li>
                    <li>
                      Comply with legal obligations and safety requirements
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    3. Information Sharing
                  </h2>
                  <p className="mb-3">We may share your information with:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>School administrators and authorized personnel</li>
                    <li>
                      Transportation partners and drivers (limited to necessary
                      information)
                    </li>
                    <li>Payment processors for billing purposes</li>
                    <li>Legal authorities when required by law</li>
                  </ul>
                  <p className="mt-3">
                    We do not sell, trade, or rent your personal information to
                    third parties.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    4. Data Security
                  </h2>
                  <p>
                    We implement appropriate security measures to protect your
                    personal information against unauthorized access,
                    alteration, disclosure, or destruction. This includes
                    encryption, secure servers, and regular security
                    assessments.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    5. Your Rights
                  </h2>
                  <p className="mb-3">You have the right to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Access and review your personal information</li>
                    <li>Request corrections to inaccurate data</li>
                    <li>Request deletion of your account and data</li>
                    <li>Opt-out of non-essential communications</li>
                    <li>Export your data in a portable format</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    6. Children's Privacy
                  </h2>
                  <p>
                    We take special care in protecting the privacy of children.
                    We only collect necessary information for transportation
                    services and require parental consent. Parents can review,
                    modify, or delete their child's information at any time.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    7. Location Data
                  </h2>
                  <p>
                    We collect location data to provide accurate pickup and
                    drop-off services, route optimization, and real-time
                    tracking. This data is used solely for service delivery and
                    is not shared with unauthorized parties.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    8. Contact Us
                  </h2>
                  <p>
                    If you have any questions about this Privacy Policy or our
                    data practices, please contact us at:
                  </p>
                  <div className="mt-3 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <p>
                      <strong>Email:</strong> privacy@schoolcabcompass.com
                    </p>
                    <p>
                      <strong>Phone:</strong> 1-800-SCHOOL-CAB
                    </p>
                    <p>
                      <strong>Address:</strong> School Cab, Privacy Department
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    9. Changes to This Policy
                  </h2>
                  <p>
                    We may update this Privacy Policy from time to time. We will
                    notify you of any changes by posting the new Privacy Policy
                    on this page and updating the "Last updated" date.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
