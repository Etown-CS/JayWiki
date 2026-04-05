using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdentities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EventRegistration_Events_EventId",
                table: "EventRegistration");

            migrationBuilder.DropForeignKey(
                name: "FK_EventRegistration_Users_UserId",
                table: "EventRegistration");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectCollaborators_Users_UserId",
                table: "ProjectCollaborators");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EventRegistration",
                table: "EventRegistration");

            migrationBuilder.DropColumn(
                name: "AuthProvider",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Users");

            migrationBuilder.RenameTable(
                name: "EventRegistration",
                newName: "EventRegistrations");

            migrationBuilder.RenameIndex(
                name: "IX_EventRegistration_UserId_EventId",
                table: "EventRegistrations",
                newName: "IX_EventRegistrations_UserId_EventId");

            migrationBuilder.RenameIndex(
                name: "IX_EventRegistration_EventId",
                table: "EventRegistrations",
                newName: "IX_EventRegistrations_EventId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EventRegistrations",
                table: "EventRegistrations",
                column: "EventRegistrationId");

            migrationBuilder.CreateTable(
                name: "UserIdentities",
                columns: table => new
                {
                    IdentityId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderEmail = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    LinkedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserIdentities", x => x.IdentityId);
                    table.ForeignKey(
                        name: "FK_UserIdentities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserIdentities_Provider_ProviderEmail",
                table: "UserIdentities",
                columns: new[] { "Provider", "ProviderEmail" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserIdentities_UserId",
                table: "UserIdentities",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_EventRegistrations_Events_EventId",
                table: "EventRegistrations",
                column: "EventId",
                principalTable: "Events",
                principalColumn: "EventId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EventRegistrations_Users_UserId",
                table: "EventRegistrations",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectCollaborators_Users_UserId",
                table: "ProjectCollaborators",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EventRegistrations_Events_EventId",
                table: "EventRegistrations");

            migrationBuilder.DropForeignKey(
                name: "FK_EventRegistrations_Users_UserId",
                table: "EventRegistrations");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectCollaborators_Users_UserId",
                table: "ProjectCollaborators");

            migrationBuilder.DropTable(
                name: "UserIdentities");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EventRegistrations",
                table: "EventRegistrations");

            migrationBuilder.RenameTable(
                name: "EventRegistrations",
                newName: "EventRegistration");

            migrationBuilder.RenameIndex(
                name: "IX_EventRegistrations_UserId_EventId",
                table: "EventRegistration",
                newName: "IX_EventRegistration_UserId_EventId");

            migrationBuilder.RenameIndex(
                name: "IX_EventRegistrations_EventId",
                table: "EventRegistration",
                newName: "IX_EventRegistration_EventId");

            migrationBuilder.AddColumn<string>(
                name: "AuthProvider",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EventRegistration",
                table: "EventRegistration",
                column: "EventRegistrationId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_EventRegistration_Events_EventId",
                table: "EventRegistration",
                column: "EventId",
                principalTable: "Events",
                principalColumn: "EventId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EventRegistration_Users_UserId",
                table: "EventRegistration",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectCollaborators_Users_UserId",
                table: "ProjectCollaborators",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
