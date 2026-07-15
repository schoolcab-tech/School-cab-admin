import { Car, FileText, Shield, Users } from "lucide-react";

const TermsAndConditions = () => {
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
              <div className="flex items-center mb-4">
                <FileText className="h-8 w-8 text-yellow-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Terms and Conditions
                </h1>
              </div>
              <p className="text-yellow-600 mb-6">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    1. Acceptance of Terms
                  </h2>
                  <p>
                    By accessing and using School Cab services, you accept and
                    agree to be bound by the terms and provision of this
                    agreement. These Terms and Conditions govern your use of our
                    transportation services, mobile application, and website.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1 flex items-center">
                    <Car className="h-5 w-5 mr-2 text-yellow-600" />
                    2. Service Description
                  </h2>
                  <p className="mb-3">School Cab provides:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>School transportation services for students</li>
                    <li>Route planning and scheduling management</li>
                    <li>Real-time tracking and notifications</li>
                    <li>Payment processing for transportation fees</li>
                    <li>
                      Communication platform between parents, schools, and
                      drivers
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-yellow-600" />
                    3. User Responsibilities
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Parents/Guardians must:
                      </h3>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>
                          Provide accurate and current information about
                          students
                        </li>
                        <li>
                          Ensure students are ready for pickup at designated
                          times
                        </li>
                        <li>Pay transportation fees promptly</li>
                        <li>
                          Notify us immediately of any changes to student
                          information
                        </li>
                        <li>
                          Supervise their children's behavior during
                          transportation
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Students must:
                      </h3>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Follow all safety rules and driver instructions</li>
                        <li>
                          Remain seated with seatbelts fastened when provided
                        </li>
                        <li>
                          Treat drivers, other students, and vehicles with
                          respect
                        </li>
                        <li>
                          Board and exit vehicles only at designated stops
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    4. Safety and Conduct
                  </h2>
                  <p className="mb-3">
                    Safety is our top priority. The following conduct is
                    strictly prohibited:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>
                      Disruptive behavior that endangers safety or distracts
                      drivers
                    </li>
                    <li>Vandalism or damage to vehicles</li>
                    <li>Harassment, bullying, or inappropriate behavior</li>
                    <li>
                      Possession of prohibited items (weapons, illegal
                      substances, etc.)
                    </li>
                    <li>Failure to follow emergency procedures</li>
                  </ul>
                  <p className="mt-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400 text-red-800">
                    <strong>Violation Notice:</strong> Serious violations may
                    result in immediate suspension of transportation services.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    5. Payment Terms
                  </h2>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">
                        Fees and Billing
                      </h3>
                      <ul className="list-disc list-inside text-yellow-700 space-y-1">
                        <li>
                          Transportation fees are charged monthly in advance
                        </li>
                        <li>
                          Payments are processed automatically unless otherwise
                          arranged
                        </li>
                        <li>Late payments may incur additional fees</li>
                        <li>Services may be suspended for non-payment</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">
                        Refund Policy
                      </h3>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        <li>
                          Refunds for unused services require 48-hour advance
                          notice
                        </li>
                        <li>
                          Emergency cancellations will be reviewed case-by-case
                        </li>
                        <li>
                          No refunds for missed pickups due to student absence
                        </li>
                        <li>
                          Service interruptions due to weather may qualify for
                          credit
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    6. Service Availability
                  </h2>
                  <p className="mb-3">Our services are subject to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Weather conditions and safety assessments</li>
                    <li>Vehicle maintenance and safety inspections</li>
                    <li>Driver availability and scheduling</li>
                    <li>School district policies and calendar</li>
                    <li>Emergency situations and unforeseen circumstances</li>
                  </ul>
                  <p className="mt-3">
                    We will provide reasonable notice of service interruptions
                    when possible.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-yellow-600" />
                    7. Liability and Insurance
                  </h2>
                  <div className="space-y-3">
                    <p>
                      <strong>Insurance Coverage:</strong> All vehicles are
                      properly insured and meet state requirements for student
                      transportation.
                    </p>
                    <p>
                      <strong>Limitation of Liability:</strong> Our liability is
                      limited to the extent permitted by law. We are not
                      responsible for:
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Personal property loss or damage</li>
                      <li>
                        Delays due to traffic, weather, or circumstances beyond
                        our control
                      </li>
                      <li>Injuries resulting from student misconduct</li>
                      <li>Consequences of providing inaccurate information</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    8. Privacy and Data Protection
                  </h2>
                  <p className="mb-3">
                    We are committed to protecting your privacy:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Student information is kept confidential and secure</li>
                    <li>
                      Location data is used solely for transportation services
                    </li>
                    <li>
                      Information is shared only with authorized school
                      personnel
                    </li>
                    <li>
                      Data retention follows our Privacy Policy guidelines
                    </li>
                  </ul>
                  <p className="mt-3">
                    Please refer to our Privacy Policy for complete details on
                    data handling.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    9. Termination
                  </h2>
                  <p className="mb-3">Either party may terminate services:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>With 30 days written notice for regular termination</li>
                    <li>Immediately for safety violations or non-payment</li>
                    <li>
                      Due to changes in school policies or district requirements
                    </li>
                    <li>For repeated violations of these terms</li>
                  </ul>
                  <p className="mt-3">
                    Upon termination, all outstanding fees become immediately
                    due.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    10. Emergency Procedures
                  </h2>
                  <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
                    <h3 className="font-semibold text-red-800 mb-2">
                      In Case of Emergency:
                    </h3>
                    <ul className="list-disc list-inside text-red-700 space-y-1">
                      <li>
                        Drivers are trained in emergency response procedures
                      </li>
                      <li>Emergency contacts will be notified immediately</li>
                      <li>
                        All vehicles are equipped with first aid kits and
                        communication devices
                      </li>
                      <li>
                        Emergency services will be contacted when necessary
                      </li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    11. Changes to Terms
                  </h2>
                  <p>
                    We reserve the right to modify these Terms and Conditions at
                    any time. Users will be notified of significant changes via
                    email or app notification. Continued use of our services
                    constitutes acceptance of updated terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    12. Contact Information
                  </h2>
                  <p className="mb-3">
                    For questions about these Terms and Conditions or our
                    services:
                  </p>
                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <p>
                      <strong>School Cab</strong>
                    </p>
                    <p>
                      <strong>Email:</strong> legal@schoolcabcompass.com
                    </p>
                    <p>
                      <strong>Phone:</strong> 1-800-SCHOOL-CAB
                    </p>
                    <p>
                      <strong>Mailing Address:</strong> School Cab Legal
                      Department
                    </p>
                    <p className="mt-2 text-sm text-yellow-700">
                      Business Hours: Monday - Friday, 8:00 AM - 6:00 PM
                    </p>
                  </div>
                </section>

                <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    By using School Cab services, you acknowledge that you have
                    read, understood, and agree to be bound by these Terms and
                    Conditions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
