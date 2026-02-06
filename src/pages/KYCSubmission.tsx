import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconArrowLeft,
  IconShield,
  IconUpload,
  IconCheck,
  IconAlertCircle,
  IconCamera,
} from "@tabler/icons-react";
import koliLogo from "@/assets/koli-logo.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { submitKyc, KYCManualData } from "@/lib/kycService";
import { useAuth } from "@/contexts/AuthContext";

export const KYCSubmission = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [idImage, setIdImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // All form fields (manually entered)
  const [formData, setFormData] = useState({
    fullLegalName: "",
    dateOfBirth: "",
    idNumber: "",
    nationality: "",
    idType: "",
    idExpirationDate: "",
    address: userData?.address || "",
    phoneNumber: userData?.phoneNumber || "",
    emergencyContact: "",
    emergencyContactPhone: "",
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIdImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idImage) {
      toast.error("Please upload your ID image");
      return;
    }

    if (!formData.fullLegalName) {
      toast.error("Full legal name is required");
      return;
    }
    
    if (!formData.dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }
    
    if (!formData.idNumber) {
      toast.error("ID number is required");
      return;
    }
    
    if (!formData.nationality) {
      toast.error("Nationality is required");
      return;
    }
    
    if (!formData.idType) {
      toast.error("ID type is required");
      return;
    }

    if (!formData.address) {
      toast.error("Address is required");
      return;
    }

    if (!formData.phoneNumber) {
      toast.error("Phone number is required");
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const manualData: KYCManualData = {
        fullLegalName: formData.fullLegalName,
        dateOfBirth: formData.dateOfBirth,
        idNumber: formData.idNumber,
        nationality: formData.nationality,
        idType: formData.idType,
        idExpirationDate: formData.idExpirationDate,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
        emergencyContact: formData.emergencyContact,
        emergencyContactPhone: formData.emergencyContactPhone,
      };
      
      await submitKyc(user.uid, idImage, manualData);
      toast.success("KYC submitted successfully!", {
        description: "Your submission is being reviewed by our team.",
      });
      
      // Check if user needs to set up PIN
      if (!userData?.hasPinSetup) {
        toast.info("Please set up your security PIN");
        navigate("/pin-setup");
      } else {
        navigate("/profile");
      }
    } catch (error: any) {
      console.error("KYC submission error:", error);
      toast.error(error.message || "Failed to submit KYC");
    } finally {
      setLoading(false);
    }
  };

  // Check if already submitted
  const hasSubmitted = userData?.kycStatus && userData.kycStatus !== "NOT_SUBMITTED";

  if (hasSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-border">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <IconAlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold">KYC Already Submitted</h2>
              <p className="text-sm text-muted-foreground">
                Your KYC submission is currently being reviewed. Status: <strong>{userData.kycStatus}</strong>
              </p>
              <Button onClick={() => navigate("/profile")} className="w-full">
                Back to Profile
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconArrowLeft size={20} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <img src={koliLogo} alt="KOLI" className="w-6 h-6" />
            <span className="font-bold text-koli-gold">KYC Verification</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <IconShield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Identity Verification</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Submit your government-issued ID to verify your identity. This is required for withdrawal access.
          </p>
        </motion.div>

        {/* Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <IconAlertCircle className="h-4 w-4 text-blue-500" />
                Requirements
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 ml-6">
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3 w-3 text-green-500" />
                  Government-issued ID (Passport, Driver's License, National ID, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3 w-3 text-green-500" />
                  ID must be valid (not expired)
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3 w-3 text-green-500" />
                  Clear, readable photo showing all details
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3 w-3 text-green-500" />
                  Image size less than 5MB
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ID Upload */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Upload ID Photo</CardTitle>
              <CardDescription>Take a clear photo of your government-issued ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imagePreview ? (
                <div className="space-y-3">
                  <img
                    src={imagePreview}
                    alt="ID Preview"
                    className="w-full rounded-lg border-2 border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIdImage(null);
                      setImagePreview(null);
                    }}
                  >
                    Change Photo
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <IconCamera className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="mb-2 text-sm text-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG or JPEG (MAX. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* ID Information - All manually entered */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IconShield className="h-5 w-5 text-primary" />
                ID Information
              </CardTitle>
              <CardDescription>
                Enter your ID details manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullLegalName">Full Legal Name *</Label>
                <Input
                  id="fullLegalName"
                  value={formData.fullLegalName}
                  onChange={(e) => setFormData({ ...formData, fullLegalName: e.target.value })}
                  placeholder="Enter your full legal name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  placeholder="MM/DD/YYYY"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  placeholder="Enter ID number"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="Your nationality"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="idType">ID Type *</Label>
                  <Select
                    value={formData.idType}
                    onValueChange={(value) => setFormData({ ...formData, idType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Philippine Passport">Philippine Passport</SelectItem>
                      <SelectItem value="Driver's License">Driver's License</SelectItem>
                      <SelectItem value="SSS ID">SSS ID</SelectItem>
                      <SelectItem value="GSIS ID">GSIS ID</SelectItem>
                      <SelectItem value="UMID">UMID (Unified Multi-Purpose ID)</SelectItem>
                      <SelectItem value="PhilHealth ID">PhilHealth ID</SelectItem>
                      <SelectItem value="TIN ID">TIN ID</SelectItem>
                      <SelectItem value="Postal ID">Postal ID</SelectItem>
                      <SelectItem value="Voter's ID">Voter's ID</SelectItem>
                      <SelectItem value="PRC ID">PRC ID (Professional License)</SelectItem>
                      <SelectItem value="Senior Citizen ID">Senior Citizen ID</SelectItem>
                      <SelectItem value="PWD ID">PWD ID</SelectItem>
                      <SelectItem value="National ID">National ID (PhilSys)</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="idExpirationDate">ID Expiration Date</Label>
                <Input
                  id="idExpirationDate"
                  type="date"
                  value={formData.idExpirationDate}
                  onChange={(e) => setFormData({ ...formData, idExpirationDate: e.target.value })}
                  placeholder="MM/DD/YYYY (optional)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Complete address"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Manual Information */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Provide your contact details (can be edited later)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="+63 912 345 6789"
                  required
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name (Optional)</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone (Optional)</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  placeholder="+63 912 345 6789"
                />
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 mb-2 flex items-center gap-2">
                <IconAlertCircle className="h-4 w-4" />
                Important: Accuracy Required
              </p>
              <p className="text-xs text-muted-foreground">
                Please ensure all information you enter matches exactly what appears on your ID. 
                Providing false or inaccurate information may result in rejection of your KYC submission 
                and may lead to account restrictions. We verify all submitted documents carefully.
              </p>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Privacy Notice:</strong> Your ID and personal information are encrypted and
                stored securely. We only use this data for verification purposes and to comply with
                regulatory requirements. Your information will never be shared with third parties.
              </p>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg" disabled={loading || !idImage}>
            {loading ? "Submitting..." : "Submit for Verification"}
          </Button>
        </motion.form>
      </main>
    </div>
  );
};

export default KYCSubmission;
