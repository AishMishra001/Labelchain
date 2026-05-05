import nacl from "tweetnacl";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import jwt from "jsonwebtoken";
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createTaskInput } from "../types";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const connection = new Connection(process.env.RPC_URL ?? "");

const PARENT_WALLET_ADDRESS = "2KeovpYvrgpziaDsq8nbNMP4mc48VNBVXb5arbqrg9Cq";

const DEFAULT_TITLE = "Select the most clickable thumbnail";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.SECRET_ACCESS_KEY ?? "",
    },
    region: process.env.AWS_REGION ?? "us-east-1"
})

const router = Router();

const prismaClient = new PrismaClient();


prismaClient.$transaction(
    async (prisma) => {
        // Code running in a transaction...
    },
    {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
    }
)

router.get("/task", authMiddleware, async (req, res) => {
    // @ts-ignore
    const taskId: string = req.query.taskId;
    // @ts-ignore
    const userId: string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    })

    if (!taskDetails) {
        return res.status(411).json({
            message: "You dont have access to this task"
        })
    }

    // Todo: Can u make this faster?
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });

    const result: Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0,
            option: {
                imageUrl: option.image_url
            }
        }
    })

    responses.forEach(r => {
        result[r.option_id].count++;
    });

    res.json({
        result,
        taskDetails
    })

})

router.post("/task", authMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId
    // validate the inputs from the user;
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    const user = await prismaClient.user.findFirst({
        where: {
            id: userId
        }
    })

    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
            details: parseData.error.errors
        })
    }

    const transaction = await connection.getTransaction(parseData.data.signature, {
        maxSupportedTransactionVersion: 1
    });

    console.log(transaction);

    if (!transaction) {
        return res.status(411).json({
            message: "Transaction not found. It might not be confirmed yet."
        })
    }

    const accountKeys = transaction.transaction.message.getAccountKeys();
    let receiverIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
        if (accountKeys.get(i)?.toString() === PARENT_WALLET_ADDRESS) {
            receiverIndex = i;
            break;
        }
    }

    if (receiverIndex === -1) {
        return res.status(411).json({
            message: "Transaction sent to wrong address (receiver not found)"
        })
    }

    const amount = (transaction?.meta?.postBalances[receiverIndex] ?? 0) - (transaction?.meta?.preBalances[receiverIndex] ?? 0);
    if (amount !== 100000000) {
        return res.status(411).json({
            message: `Transaction signature/amount incorrect. Expected 100000000, got ${amount}. postBalances: ${transaction?.meta?.postBalances[receiverIndex]}, preBalances: ${transaction?.meta?.preBalances[receiverIndex]}`
        })
    }

    if (accountKeys.get(0)?.toString() !== user?.address) {
        return res.status(411).json({
            message: "Transaction sent to wrong address (0)"
        })
    }
    // was this money paid by this user address or a different address?

    // parse the signature here to ensure the person has paid 0.1 SOL
    // const transaction = Transaction.from(parseData.data.signature);

    let response = await prismaClient.$transaction(async tx => {

        const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: 0.1 * TOTAL_DECIMALS,
                //TODO: Signature should be unique in the table else people can reuse a signature
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })

        return response;

    })

    res.json({
        id: response.id
    })

})

router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: process.env.S3_BUCKET ?? "",
        Key: `fiver/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
    })

})

router.post("/signin", async (req, res) => {
    const { publicKey, signature } = req.body;
    const message = new TextEncoder().encode("Sign into mechanical turks");

    console.log("Signin request received:", { publicKey, signatureType: typeof signature, hasData: !!signature?.data });

    let result;
    try {
        let signatureArray;
        if (Array.isArray(signature)) {
            signatureArray = signature;
        } else if (signature && signature.data) {
            signatureArray = signature.data;
        } else if (typeof signature === 'object' && signature !== null) {
            signatureArray = Object.values(signature);
        } else {
            signatureArray = [];
        }
        
        result = nacl.sign.detached.verify(
            message,
            new Uint8Array(signatureArray),
            new PublicKey(publicKey).toBytes(),
        );
    } catch (e) {
        console.error("Signature verification error:", e);
        result = false;
    }

    if (!result) {
        return res.status(411).json({
            message: "Incorrect signature"
        })
    }

    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: publicKey
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRET)

        res.json({
            token
        })
    } else {
        const user = await prismaClient.user.create({
            data: {
                address: publicKey,
            }
        })

        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)

        res.json({
            token
        })
    }
});

export default router;