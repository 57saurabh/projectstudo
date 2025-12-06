import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { UserModel as User } from "@/models/User.schema";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// -----------------------------
// Extract User ID
// -----------------------------
function getUserId(req: Request): string | null {
    const authHeader = req.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
        try {
            const token = authHeader.split(" ")[1];
            const decoded: any = jwt.verify(token, JWT_SECRET);
            return decoded.id;
        } catch {
            return null;
        }
    }

    return req.headers.get("x-user-id");
}

// -----------------------------
// GET USER
// -----------------------------
export async function GET(req: Request) {
    try {
        await dbConnect();

        const userId = getUserId(req);
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (err) {
        console.error("GET /user/me error:", err);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

// -----------------------------
// PUT USER (UPDATE PROFILE)
// -----------------------------
export async function PUT(req: Request) {
    try {
        await dbConnect();

        const userId = getUserId(req);
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // -----------------------------
        // Allowed Top-Level Fields
        // -----------------------------
        const allowedFields = [
            "theme",
            "displayName",
            "username",
            "bio",
            "profession",
            "website",
            "gender",
            "age",
            "country",
            "interests",
            "preferences",
            "avatarUrl"
        ];

        const updateData: any = {};

        for (const field of allowedFields) {
            if (field in body) {
                updateData[field] = body[field];
            }
        }

        // -----------------------------
        // PROFESSION VALIDATION
        // -----------------------------
        if (updateData.profession) {
            if (typeof updateData.profession !== "object") {
                return NextResponse.json(
                    { message: "Invalid profession format" },
                    { status: 400 }
                );
            }

            const allowedProfessionKeys = [
                "type",
                "university",
                "company",
                "hospital",
                "occupationPlace"
            ];

            const cleanProfession: any = {};
            for (const key of allowedProfessionKeys) {
                if (key in updateData.profession) {
                    cleanProfession[key] = updateData.profession[key];
                }
            }

            if (Object.keys(cleanProfession).length === 0) {
                updateData.profession = undefined;
            } else {
                updateData.profession = cleanProfession;
            }
        }

        // -----------------------------
        // PREFERENCES VALIDATION (Your Request)
        // -----------------------------
        if (updateData.preferences) {
            if (typeof updateData.preferences !== "object") {
                return NextResponse.json(
                    { message: "Invalid preferences format" },
                    { status: 400 }
                );
            }

            const allowedPreferenceKeys = [
                "matchGender",       // "male" | "female" | "any"
                "matchRegion",       // "same-country" | "global"
                "minAge",
                "maxAge",
                "region",            // array of strings
                "languages",         // array of strings
                "languageCountries"  // array of strings
            ];

            const cleanPreferences: any = {};
            for (const key of allowedPreferenceKeys) {
                if (key in updateData.preferences) {
                    cleanPreferences[key] = updateData.preferences[key];
                }
            }

            if (Object.keys(cleanPreferences).length === 0) {
                updateData.preferences = undefined;
            } else {
                updateData.preferences = cleanPreferences;
            }
        }

        console.log("Final updateData:", updateData);

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (err: any) {
        console.error("PUT /user/me error:", err);

        if (err.name === "ValidationError") {
            return NextResponse.json({ message: err.message }, { status: 400 });
        }

        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
