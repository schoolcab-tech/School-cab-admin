import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, Shield, Trash2 } from "lucide-react";

const AccountDeletion = () => {
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
                <Trash2 className="h-8 w-8 text-red-500 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Account Deletion Guide
                </h1>
              </div>
              <p className="text-yellow-600 mb-6">
                Learn how to permanently delete your School Cab account
              </p>

              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Important:</strong> Account deletion is permanent and
                  cannot be undone. Please read this guide carefully before
                  proceeding.
                </AlertDescription>
              </Alert>

              <div className="space-y-6 text-gray-700 leading-relaxed">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-yellow-600" />
                    Before You Delete Your Account
                  </h2>
                  <p className="mb-3">
                    Please consider the following before deleting your account:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>
                      <strong>Data Loss:</strong> All your personal information,
                      booking history, and preferences will be permanently
                      deleted
                    </li>
                    <li>
                      <strong>Active Bookings:</strong> Cancel any upcoming
                      transportation bookings before deletion
                    </li>
                    <li>
                      <strong>Outstanding Payments:</strong> Settle any pending
                      payments or billing issues
                    </li>
                    <li>
                      <strong>Student Information:</strong> Student data will be
                      removed, affecting their transportation services
                    </li>
                    <li>
                      <strong>Recovery Impossible:</strong> Once deleted, your
                      account cannot be recovered or restored
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    How to Delete Your Account
                  </h2>

                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400 mb-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">
                      Method 1: Through the Mobile App
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-yellow-700">
                      <li>Open the School Cab mobile app</li>
                      <li>
                        Go to <strong>Settings</strong> or{" "}
                        <strong>Profile</strong> section
                      </li>
                      <li>
                        Scroll down to find <strong>"Delete Account"</strong>{" "}
                        option
                      </li>
                      <li>
                        Tap on <strong>"Delete Account"</strong>
                      </li>
                      <li>Read the warning message carefully</li>
                      <li>Enter your password to confirm</li>
                      <li>
                        Tap <strong>"Permanently Delete"</strong> to confirm
                      </li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 mb-4">
                    <h3 className="font-semibold text-blue-800 mb-2">
                      Method 2: Contact Support
                    </h3>
                    <p className="text-blue-700 mb-2">
                      If you cannot access the delete option in the app, contact
                      our support team:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700 ml-4">
                      <li>
                        <strong>Email:</strong> support@schoolcabcompass.com
                      </li>
                      <li>
                        <strong>Subject:</strong> "Account Deletion Request"
                      </li>
                      <li>
                        <strong>Include:</strong> Your full name, email address,
                        and reason for deletion
                      </li>
                      <li>
                        <strong>Phone:</strong> 1-800-SCHOOL-CAB
                      </li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-yellow-600" />
                    What Happens After Deletion
                  </h2>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Immediate Effects (Within 24 hours)
                      </h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Your account will be deactivated</li>
                        <li>You will no longer be able to log in</li>
                        <li>All active bookings will be cancelled</li>
                        <li>Push notifications will stop</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        Complete Deletion (Within 30 days)
                      </h3>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>
                          All personal information removed from our systems
                        </li>
                        <li>Booking history permanently deleted</li>
                        <li>Payment information securely destroyed</li>
                        <li>Account recovery becomes impossible</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-yellow-800 mb-2">
                        Data We May Retain
                      </h3>
                      <p className="text-yellow-700 mb-2">
                        For legal and safety reasons, we may retain:
                      </p>
                      <ul className="list-disc list-inside text-yellow-700 space-y-1">
                        <li>
                          Anonymized usage statistics (cannot be linked back to
                          you)
                        </li>
                        <li>
                          Financial records required by law (for up to 7 years)
                        </li>
                        <li>Safety incident reports involving your account</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    Alternatives to Account Deletion
                  </h2>
                  <p className="mb-3">
                    Consider these alternatives before permanent deletion:
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <strong className="text-green-800">
                        Temporarily Deactivate:
                      </strong>
                      <span className="text-green-700">
                        {" "}
                        Pause your account without losing data
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <strong className="text-blue-800">
                        Update Privacy Settings:
                      </strong>
                      <span className="text-blue-700">
                        {" "}
                        Limit data collection and sharing
                      </span>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                      <strong className="text-purple-800">
                        Change Notification Preferences:
                      </strong>
                      <span className="text-purple-700">
                        {" "}
                        Reduce or stop emails and notifications
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b-2 border-yellow-200 pb-1">
                    Need Help?
                  </h2>
                  <p className="mb-3">
                    If you have questions about account deletion or need
                    assistance:
                  </p>
                  <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <p>
                      <strong>Support Email:</strong>{" "}
                      support@schoolcabcompass.com
                    </p>
                    <p>
                      <strong>Phone:</strong> 1-800-SCHOOL-CAB
                    </p>
                    <p>
                      <strong>Hours:</strong> Monday - Friday, 8:00 AM - 6:00 PM
                    </p>
                    <p className="mt-2 text-sm text-yellow-700">
                      Our support team is here to help you make the best
                      decision for your needs.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletion;
