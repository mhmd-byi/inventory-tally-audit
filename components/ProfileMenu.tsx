'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { signOut } from 'next-auth/react';
import { ChevronDown, LogOut, LayoutDashboard, Users } from 'lucide-react';

interface ProfileMenuProps {
    user: {
        name?: string | null;
        email?: string | null;
        role?: string;
    };
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
    const handleSignOut = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formatRole = (role?: string) => {
        if (!role) return 'User';
        return role
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors focus:outline-none">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase">
                    {getInitials(user.name)}
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-bold text-black leading-none">{user.name}</p>
                    <p className="text-xs font-medium text-zinc-400 mt-1">{formatRole(user.role)}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-400" />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-xl shadow-lg border border-zinc-200 focus:outline-none divide-y divide-zinc-100">
                    <div className="px-5 py-4">
                        <p className="text-sm font-bold text-black">{user.name}</p>
                        <p className="text-xs font-medium text-zinc-400 truncate">{user.email}</p>
                    </div>

                    <div className="py-2">
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="/dashboard"
                                    className={`${active ? 'bg-zinc-50' : ''
                                        } flex items-center px-4 py-2 text-sm font-medium text-black`}
                                >
                                    <LayoutDashboard className="w-4 h-4 mr-3 text-zinc-400" />
                                    Dashboard
                                </a>
                            )}
                        </Menu.Item>

                        {user.role === 'admin' && (
                            <Menu.Item>
                                {({ active }) => (
                                    <a
                                        href="/dashboard/users"
                                        className={`${active ? 'bg-zinc-50' : ''
                                            } flex items-center px-4 py-2 text-sm font-medium text-black`}
                                    >
                                        <Users className="w-4 h-4 mr-3 text-zinc-400" />
                                        Manage Users
                                    </a>
                                )}
                            </Menu.Item>
                        )}
                    </div>

                    <div className="py-2">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={handleSignOut}
                                    className={`${active ? 'bg-zinc-50' : ''
                                        } flex items-center w-full px-4 py-2 text-sm font-bold text-black`}
                                >
                                    <LogOut className="w-4 h-4 mr-3 text-zinc-400" />
                                    Logout
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
