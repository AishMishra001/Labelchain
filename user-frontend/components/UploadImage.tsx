"use client"
import { BACKEND_URL, CLOUDFRONT_URL } from "@/utils";
import axios from "axios";
import { useState } from "react"

export function UploadImage({ onImageAdded, image }: {
    onImageAdded: (image: string) => void;
    image?: string;
}) {
    const [uploading, setUploading] = useState(false);

    async function onFileSelect(e: any) {
        setUploading(true);
        try {
            const file = e.target.files[0];
            const token = localStorage.getItem("token");
            if (!token) {
                console.error("No token found in localStorage");
                setUploading(false);
                return;
            }
            const response = await axios.get(`${BACKEND_URL}/v1/user/presignedUrl`, {
                headers: {
                    "Authorization": token
                }
            });
            const presignedUrl = response.data.preSignedUrl;
            const formData = new FormData();
            formData.set("bucket", response.data.fields["bucket"])
            formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
            formData.set("X-Amz-Credential", response.data.fields["X-Amz-Credential"]);
            formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
            formData.set("X-Amz-Date", response.data.fields["X-Amz-Date"]);
            formData.set("key", response.data.fields["key"]);
            formData.set("Policy", response.data.fields["Policy"]);
            formData.set("X-Amz-Signature", response.data.fields["X-Amz-Signature"]);
            formData.set("X-Amz-Algorithm", response.data.fields["X-Amz-Algorithm"]);
            formData.append("file", file);
            const awsResponse = await axios.post(presignedUrl, formData);

            // If CLOUDFRONT_URL is not set, use the S3 bucket URL directly as a fallback
            const finalImageUrl = CLOUDFRONT_URL 
                ? `${CLOUDFRONT_URL}/${response.data.fields["key"]}`
                : `${presignedUrl}${response.data.fields["key"]}`;
            
            onImageAdded(finalImageUrl);
        } catch(e) {
            console.log(e)
        }
        setUploading(false);
    }

    // Determine the correct preview URL
    let previewUrl = image;
    if (image) {
        if (image.includes("d2szwvl7yo497w.cloudfront.net")) {
            previewUrl = image.replace("d2szwvl7yo497w.cloudfront.net", CLOUDFRONT_URL.replace("https://", ""));
        } else if (!image.startsWith("http")) {
            previewUrl = `${CLOUDFRONT_URL}/${image}`;
        }
    }

    return (
        <div className="w-full h-full min-h-[160px] flex items-center justify-center">
            {image ? (
                <div className="relative w-full h-full flex items-center justify-center p-2 group">
                    <img className="rounded-xl object-cover max-h-40 w-full" src={previewUrl} alt="Uploaded preview" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 font-medium transition-all">Change</span>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full">
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-3 text-gray-400 group-hover:text-blue-500 transition-colors" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500 group-hover:text-gray-700 transition-colors"><span className="font-semibold">Click to upload</span></p>
                            <p className="text-xs text-gray-400">PNG, JPG or WebP</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" onChange={onFileSelect} />
                    </label>
                </div>
            )}
        </div>
    );
}