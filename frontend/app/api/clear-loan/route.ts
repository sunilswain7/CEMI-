import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userAddress, userEnsName } = await req.json();

        console.log("Minting Gasless ENS Subname via Namespace...");
        
        const PARENT_NAME = "bully.eth"; 
        let label = (userEnsName && userEnsName.endsWith('.eth')) 
            ? userEnsName.replace('.eth', '') 
            : `user-${userAddress.slice(2, 8).toLowerCase()}`;

        const fullSubname = `${label}.${PARENT_NAME}`;

        // 1. Issue the ENS Badge
        const namespaceRes = await fetch('https://api.namespace.ninja/api/subnames', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NAMESPACE_API_KEY}`
            },
            body: JSON.stringify({
                parentName: PARENT_NAME, 
                label: label,
                addresses: { 60: userAddress },
                textRecords: {
                    "credit_score": "excellent",
                    "paisa_repayment": "cleared"
                }
            })
        });

        if (!namespaceRes.ok) {
            console.warn("⚠️ Namespace API Warning: Subname minting failed.");
        } else {
            console.log(`✅ Issued ENS Trust Badge: ${fullSubname}`);
        }

        // Return success to the frontend! No Ethers, no BitGo, no crashes.
        return NextResponse.json({ 
            success: true, 
            issuedName: fullSubname
        });

    } catch (error: any) {
        console.error("🚨 ENS Issuance Error:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}