const { GraphQLError } = require('graphql');

function requireAuth(context) {
  if (!context.user) {
    throw new GraphQLError('Authentication required.', {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
}

function requireRole(context, allowedRoles = []) {
  requireAuth(context);

  if (!allowedRoles.includes(context.user.role)) {
    throw new GraphQLError('You do not have permission to perform this action.', {
      extensions: {
        code: 'FORBIDDEN',
      },
    });
  }
}

module.exports = {
  requireAuth,
  requireRole,
};
