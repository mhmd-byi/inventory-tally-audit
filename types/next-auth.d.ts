import 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        role: string;
        organization?: string;
        warehouse?: string;
        warehouses?: string[];
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            role: string;
            organization?: string;
            warehouse?: string;
            warehouses?: string[];
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: string;
        organization?: string;
        warehouse?: string;
        warehouses?: string[];
    }
}
